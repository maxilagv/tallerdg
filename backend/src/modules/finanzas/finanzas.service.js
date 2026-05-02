const ExcelJS = require("exceljs");
const AppError = require("../../shared/errors/AppError");
const FinanzasRepository = require("./finanzas.repository");
const ConfiguracionService = require("../configuracion/configuracion.service");
const ConfiguracionRepository = require("../configuracion/configuracion.repository");
const {
  resumenSchema,
  rangoSchema,
  porDiaSchema,
  movimientosSchema,
  movimientosMesSchema,
  movimientoTitularCreateSchema,
  movimientoTitularUpdateSchema,
  movimientosTitularListSchema,
  resetCajaSchema,
} = require("./finanzas.validation");

// ── Helpers de formato ────────────────────────────────────────────────────────

function fmtMoney(v) {
  return `$ ${Number(v || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(v) {
  if (!v) return "-";
  const s = String(v).slice(0, 10).split("-");
  if (s.length === 3) return `${s[2]}/${s[1]}/${s[0]}`;
  return String(v).slice(0, 10);
}

// ── Paleta de colores Excel ───────────────────────────────────────────────────

const VERDE_BG   = "FF1a472a";
const TEAL_BG    = "FF0d3a2e";
const ROJO_BG    = "FF4a1a1a";
const NARANJA_BG = "FF4a2e1a";
const AZUL_BG    = "FF1a2a4a";
const VIOLETA_BG = "FF2d1a4a"; // movimientos titular
const GRIS_BG    = "FF1e2433";
const HEADER_BG  = "FF1e293b";
const TITULO_BG  = "FF7c3aed";

const WHITE_FONT = { color: { argb: "FFFFFFFF" }, bold: true };
const GRAY_FONT  = { color: { argb: "FF94a3b8" } };

function applyHeader(row, bg = HEADER_BG) {
  row.eachCell((cell) => {
    cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
    cell.font  = { ...WHITE_FONT };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FF374151" } } };
  });
  row.height = 22;
}

function borderAll(cell) {
  const b = { style: "thin", color: { argb: "FF374151" } };
  cell.border = { top: b, left: b, bottom: b, right: b };
}

const METODOS_LABEL = {
  efectivo: "Efectivo", transferencia: "Transferencia",
  tarjeta_debito: "Tarjeta Débito", tarjeta_credito: "Tarjeta Crédito",
  cheque: "Cheque", tarjeta: "Tarjeta", otro: "Otro",
};

// ─────────────────────────────────────────────────────────────────────────────
// ANÁLISIS INTELIGENTE
// Clasifica los días del período y genera alertas contextuales en español.
// ─────────────────────────────────────────────────────────────────────────────

function computarAnalisis({ porDia, porCategoria, resumen }) {
  // Construir mapa de días
  const diaMap = {};
  const addSerie = (serie, campo) => {
    (serie || []).forEach(({ dia, total }) => {
      const k = String(dia).slice(0, 10);
      if (!diaMap[k]) diaMap[k] = { ingresos: 0, gastos: 0, compras: 0 };
      diaMap[k][campo] += Number(total);
    });
  };
  addSerie(porDia.ingresos, "ingresos");
  addSerie(porDia.gastos,   "gastos");
  addSerie(porDia.compras,  "compras");

  const dias = Object.entries(diaMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, { ingresos, gastos, compras }]) => {
      const neto           = ingresos - gastos - compras;
      const netoSinCompras = ingresos - gastos; // resultado si no hubiera compras

      /**
       * Clasificación de días:
       *  positivo           → ganó plata (todo cubierto + excedente)
       *  neutro             → exactamente cero
       *  abastecimiento     → negativo SOLO por compras (operaciones OK)
       *  perdida_operativa  → los gastos superaron los ingresos, sin importar compras
       */
      let tipoDia;
      if (neto > 0)                 tipoDia = "positivo";
      else if (neto === 0)          tipoDia = "neutro";
      else if (netoSinCompras >= 0) tipoDia = "abastecimiento";
      else                          tipoDia = "perdida_operativa";

      return { fecha, ingresos, gastos, compras, neto, netoSinCompras, tipoDia };
    });

  const n                  = dias.length;
  const diasPositivos      = dias.filter((d) => d.tipoDia === "positivo");
  const diasAbastecimiento = dias.filter((d) => d.tipoDia === "abastecimiento");
  const diasPerdida        = dias.filter((d) => d.tipoDia === "perdida_operativa");

  const mejorDia = n > 0 ? dias.reduce((a, b) => (a.neto > b.neto ? a : b)) : null;
  const peorDia  = diasPerdida.length > 0
    ? diasPerdida.reduce((a, b) => (a.netoSinCompras < b.netoSinCompras ? a : b))
    : null;

  const promedioIngresoDiario = n > 0
    ? Math.round(dias.reduce((s, d) => s + d.ingresos, 0) / n)
    : 0;

  // Tendencia: comparar primera mitad vs segunda mitad del período
  let tendencia = "estable";
  if (n >= 4) {
    const mitad    = Math.floor(n / 2);
    const avg1 = dias.slice(0, mitad).reduce((s, d) => s + d.neto, 0) / mitad;
    const avg2 = dias.slice(mitad).reduce((s, d) => s + d.neto, 0)   / (n - mitad);
    const diferencia = avg2 - avg1;
    // Solo marcar tendencia si la diferencia es > 5% del promedio de ingresos
    const umbral = promedioIngresoDiario * 0.05;
    if (Math.abs(diferencia) > umbral) {
      tendencia = diferencia > 0 ? "subiendo" : "bajando";
    }
  }

  // Categoría con mayor peso en gastos
  const categoriaMayor = porCategoria.length > 0 ? porCategoria[0] : null;
  const pctCategoriaMayor = categoriaMayor && resumen.gastos > 0
    ? Math.round((Number(categoriaMayor.total) / resumen.gastos) * 100)
    : 0;

  // % aporte de ventas rápidas al total de ingresos
  const pctVR = resumen.ingresos > 0
    ? Math.round((resumen.ventas_rapidas_total / resumen.ingresos) * 100)
    : 0;

  // ── Generar alertas contextuales ──────────────────────────────────────────
  const alertas = [];

  if (n === 0) {
    alertas.push({ nivel: "info", mensaje: "Sin movimientos operativos en el período seleccionado." });
  } else {
    // Resultado general
    if (resumen.resultado_neto > 0) {
      const gananciaDiaria = Math.round(resumen.resultado_neto / n);
      alertas.push({
        nivel: "ok",
        mensaje: `Período positivo. Resultado operativo de ${fmtMoney(resumen.resultado_neto)} — promedio de ${fmtMoney(gananciaDiaria)} por día activo.`,
      });
    } else if (resumen.resultado_neto < 0) {
      alertas.push({
        nivel: "danger",
        mensaje: `Resultado operativo negativo en el período (${fmtMoney(resumen.resultado_neto)}). Los egresos superaron los ingresos.`,
      });
    }

    // Días con pérdida real
    if (diasPerdida.length === 0) {
      alertas.push({ nivel: "ok", mensaje: "Sin días de pérdida operativa. Los ingresos cubrieron los gastos todos los días." });
    } else {
      const lvl = diasPerdida.length <= 2 ? "warning" : "danger";
      alertas.push({
        nivel: lvl,
        mensaje: `${diasPerdida.length} día${diasPerdida.length > 1 ? "s" : ""} con pérdida operativa — los gastos superaron los ingresos. Revisá esos días en el detalle mensual.`,
      });
    }

    // Días de abastecimiento (informativos, no preocupantes)
    if (diasAbastecimiento.length > 0) {
      const totalInvertido = diasAbastecimiento.reduce((s, d) => s + d.compras, 0);
      alertas.push({
        nivel: "info",
        mensaje: `${diasAbastecimiento.length} día${diasAbastecimiento.length > 1 ? "s negativos fueron" : " negativo fue"} por compras a proveedor (${fmtMoney(totalInvertido)} invertidos en stock). Esto es normal — es capital de trabajo, no pérdida.`,
      });
    }

    // Tendencia del período
    if (n >= 4) {
      if (tendencia === "subiendo") {
        alertas.push({ nivel: "ok",     mensaje: "Tendencia positiva: la segunda mitad del período está rindiendo mejor que la primera." });
      } else if (tendencia === "bajando") {
        alertas.push({ nivel: "warning", mensaje: "Tendencia descendente: los resultados de la segunda mitad del período son menores. Prestá atención." });
      }
    }

    // Categoría dominante en gastos
    if (categoriaMayor && pctCategoriaMayor >= 35) {
      alertas.push({
        nivel: "warning",
        mensaje: `"${categoriaMayor.categoria}" representa el ${pctCategoriaMayor}% del total de gastos (${fmtMoney(categoriaMayor.total)}). Si es un gasto fijo, considerá si hay margen de negociación.`,
      });
    }

    // Ventas rápidas relevantes
    if (pctVR >= 15) {
      alertas.push({
        nivel: "ok",
        mensaje: `La Caja Rápida aportó el ${pctVR}% de los ingresos del período (${fmtMoney(resumen.ventas_rapidas_total)}). Buen rendimiento del mostrador.`,
      });
    } else if (resumen.cantidad_ventas_rapidas === 0 && n > 0) {
      alertas.push({
        nivel: "info",
        mensaje: "Sin ventas en Caja Rápida en el período. Si el taller vende productos al paso, activá ese módulo para no perder esos ingresos.",
      });
    }

    // Movimientos del titular
    if (resumen.cantidad_movimientos_titular > 0) {
      alertas.push({
        nivel: "info",
        mensaje: `${resumen.cantidad_movimientos_titular} movimiento${resumen.cantidad_movimientos_titular > 1 ? "s" : ""} del titular registrado${resumen.cantidad_movimientos_titular > 1 ? "s" : ""}. El Saldo Real incluye estos movimientos.`,
      });
    }
  }

  return {
    dias_con_actividad:    n,
    dias_positivos:        diasPositivos.length,
    dias_abastecimiento:   diasAbastecimiento.length,
    dias_perdida_operativa: diasPerdida.length,
    promedio_ingreso_diario: promedioIngresoDiario,
    mejor_dia:             mejorDia,
    peor_dia_operativo:    peorDia,
    tendencia,
    categoria_mayor: categoriaMayor ? {
      nombre:     categoriaMayor.categoria,
      total:      Number(categoriaMayor.total),
      porcentaje: pctCategoriaMayor,
    } : null,
    pct_ventas_rapidas: pctVR,
    alertas,
  };
}

const CAJA_RESET_KEYS = {
  usado: "caja_reset_usado",
  fecha: "caja_reset_fecha",
  at: "caja_reset_at",
  empleadoId: "caja_reset_empleado_id",
};

function parseEstadoResetCaja(config = {}) {
  const usado = config[CAJA_RESET_KEYS.usado] === "1";
  return {
    usado,
    puede_resetear: !usado,
    fecha: usado ? config[CAJA_RESET_KEYS.fecha] || null : null,
    reset_at: usado ? config[CAJA_RESET_KEYS.at] || null : null,
    empleado_id: usado ? Number(config[CAJA_RESET_KEYS.empleadoId] || 0) || null : null,
  };
}

async function getOpcionesCaja(cajaIniciaEnCero = true) {
  const estado = parseEstadoResetCaja(await ConfiguracionService.obtener());
  return {
    cajaIniciaEnCero,
    cajaResetFecha: estado.fecha,
    cajaResetAt: estado.reset_at,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

const FinanzasService = {

  // ── Consultas de reporte ──────────────────────────────────────────────────

  async resumen(query) {
    const parsed = resumenSchema.safeParse(query);
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Parámetros inválidos.", 400, "VALIDATION_ERROR");
    const opciones = await getOpcionesCaja(parsed.data.caja_inicia_en_cero);
    return FinanzasRepository.getResumen(parsed.data.desde, parsed.data.hasta, opciones);
  },

  async porDia(query) {
    const parsed = porDiaSchema.safeParse(query);
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Parámetros inválidos.", 400, "VALIDATION_ERROR");
    return FinanzasRepository.getPorDia(parsed.data.desde, parsed.data.hasta, await getOpcionesCaja());
  },

  async movimientosMes(query) {
    const parsed = movimientosMesSchema.safeParse(query);
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Parámetros inválidos.", 400, "VALIDATION_ERROR");
    return FinanzasRepository.getMovimientosMes(parsed.data.mes, parsed.data.anio, await getOpcionesCaja());
  },

  async gastosPorCategoria(query) {
    const parsed = rangoSchema.safeParse(query);
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Parámetros inválidos.", 400, "VALIDATION_ERROR");
    return FinanzasRepository.getGastosPorCategoria(parsed.data.desde, parsed.data.hasta, await getOpcionesCaja());
  },

  async movimientos(query) {
    const parsed = movimientosSchema.safeParse(query);
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Parámetros inválidos.", 400, "VALIDATION_ERROR");
    return FinanzasRepository.getMovimientos(parsed.data.desde, parsed.data.hasta, parsed.data.page, parsed.data.limit, await getOpcionesCaja());
  },

  // ── Análisis inteligente ──────────────────────────────────────────────────

  async movimientosDetalle(query) {
    const parsed = rangoSchema.safeParse(query);
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Parametros invalidos.", 400, "VALIDATION_ERROR");
    return FinanzasRepository.getMovimientosDetalle(parsed.data.desde, parsed.data.hasta, await getOpcionesCaja());
  },

  async analisis(query) {
    const parsed = rangoSchema.safeParse(query);
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Parámetros inválidos.", 400, "VALIDATION_ERROR");
    const datos = await FinanzasRepository.getAnalisisDatos(parsed.data.desde, parsed.data.hasta, await getOpcionesCaja());
    return computarAnalisis(datos);
  },

  async estadoResetCaja() {
    return parseEstadoResetCaja(await ConfiguracionService.obtener());
  },

  async resetCaja(body, empleadoId) {
    const parsed = resetCajaSchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");

    const estadoActual = await this.estadoResetCaja();
    if (estadoActual.usado) {
      throw new AppError("El reset de caja ya fue aplicado. Es una accion de un solo uso.", 409, "CAJA_RESET_ALREADY_USED");
    }

    const resetAt = new Date().toISOString().slice(0, 19).replace("T", " ");
    await ConfiguracionRepository.upsertMany([
      { clave: CAJA_RESET_KEYS.usado, valor: "1", descripcion: "Indica si el reset de caja ya fue aplicado" },
      { clave: CAJA_RESET_KEYS.fecha, valor: parsed.data.fecha, descripcion: "Fecha desde la que la caja arranca en cero" },
      { clave: CAJA_RESET_KEYS.at, valor: resetAt, descripcion: "Fecha y hora exacta del reset de caja" },
      { clave: CAJA_RESET_KEYS.empleadoId, valor: empleadoId ? String(empleadoId) : "", descripcion: "Empleado que aplico el reset de caja" },
    ]);

    return this.estadoResetCaja();
  },

  // ── CRUD Movimientos del Titular ──────────────────────────────────────────

  async listarMovimientosTitular(query) {
    const parsed = movimientosTitularListSchema.safeParse(query);
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Parámetros inválidos.", 400, "VALIDATION_ERROR");
    return FinanzasRepository.getMovimientosTitular({ ...parsed.data, ...(await getOpcionesCaja()) });
  },

  async crearMovimientoTitular(body, empleadoId) {
    const parsed = movimientoTitularCreateSchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Datos inválidos.", 400, "VALIDATION_ERROR");

    return FinanzasRepository.crearMovimientoTitular({
      ...parsed.data,
      empleado_id: empleadoId || null,
    });
  },

  async actualizarMovimientoTitular(id, body) {
    const parsed = movimientoTitularUpdateSchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Datos inválidos.", 400, "VALIDATION_ERROR");
    if (!Object.keys(parsed.data).length) throw new AppError("Sin campos para actualizar.", 400, "VALIDATION_ERROR");

    const resultado = await FinanzasRepository.actualizarMovimientoTitular(id, parsed.data);
    if (!resultado) throw new AppError("Movimiento no encontrado.", 404, "NOT_FOUND");
    return resultado;
  },

  async eliminarMovimientoTitular(id) {
    const filas = await FinanzasRepository.eliminarMovimientoTitular(id);
    if (!filas) throw new AppError("Movimiento no encontrado.", 404, "NOT_FOUND");
  },

  // ── Export Excel ────────────────────────────────────────────────────────────
  async exportarExcel(query) {
    const parsed = resumenSchema.safeParse(query);
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Fechas inválidas.", 400, "VALIDATION_ERROR");
    const { desde, hasta, caja_inicia_en_cero: cajaIniciaEnCero } = parsed.data;

    // Límite de 6 meses para evitar timeouts y archivos excesivamente grandes.
    const SEIS_MESES_MS = 6 * 30 * 24 * 60 * 60 * 1000;
    if (new Date(hasta).getTime() - new Date(desde).getTime() > SEIS_MESES_MS) {
      throw new AppError(
        "El rango de exportación no puede superar los 6 meses. Reducí el período e intentá de nuevo.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const opciones = await getOpcionesCaja(cajaIniciaEnCero);
    const [resumen, movimientos, porCategoria, porDia, analisis, config] = await Promise.all([
      FinanzasRepository.getResumen(desde, hasta, opciones),
      FinanzasRepository.getMovimientosTodos(desde, hasta, opciones),
      FinanzasRepository.getGastosPorCategoria(desde, hasta, opciones),
      FinanzasRepository.getPorDia(desde, hasta, opciones),
      FinanzasRepository.getAnalisisDatos(desde, hasta, opciones).then(computarAnalisis),
      ConfiguracionService.obtener(),
    ]);

    const nombreTaller = (config.taller_nombre || "").trim() || "TallerPro";
    const wb = new ExcelJS.Workbook();
    wb.creator = nombreTaller;
    wb.created = new Date();
    const moneyFmt = '"$ "#,##0.00';

    // ═══════════════════════════════════════════════════════════════════════
    // HOJA 1 — RESUMEN DE CAJA
    // ═══════════════════════════════════════════════════════════════════════
    const wsR = wb.addWorksheet("Resumen", { tabColor: { argb: "FF7c3aed" } });
    wsR.columns = [{ width: 38 }, { width: 22 }];

    wsR.mergeCells("A1:B1");
    const t1 = wsR.getCell("A1");
    t1.value = `RESUMEN DE CAJA — ${nombreTaller.toUpperCase()}`;
    t1.font = { size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    t1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITULO_BG } };
    t1.alignment = { horizontal: "center", vertical: "middle" };
    wsR.getRow(1).height = 30;

    wsR.mergeCells("A2:B2");
    const t2 = wsR.getCell("A2");
    t2.value = `Período: ${fmtDate(desde)}  al  ${fmtDate(hasta)}`;
    t2.font = { italic: true, color: { argb: "FF94a3b8" } };
    t2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS_BG } };
    t2.alignment = { horizontal: "center", vertical: "middle" };
    wsR.getRow(2).height = 18;
    wsR.addRow([]);

    const kpis = [
      { label: "INGRESOS TOTALES",             value: resumen.ingresos,        bg: VERDE_BG,   bold: true  },
      { label: "  Cobros de órdenes",           value: resumen.cobros_ordenes,  bg: TEAL_BG,    bold: false },
      { label: "  Abonos de deuda",             value: resumen.abonos_deuda_total, bg: TEAL_BG, bold: false },
      { label: "  Ventas Rápidas (Caja)",       value: resumen.ventas_rapidas_total, bg: TEAL_BG, bold: false },
      { label: "",                               value: null,                    bg: GRIS_BG,    bold: false },
      { label: "Gastos operativos",             value: resumen.gastos,          bg: ROJO_BG,    bold: false },
      { label: "Compras a proveedores",         value: resumen.compras,         bg: NARANJA_BG, bold: false },
      { label: "TOTAL EGRESOS",                 value: resumen.egresos,         bg: ROJO_BG,    bold: true  },
      { label: "",                               value: null,                    bg: GRIS_BG,    bold: false },
      { label: "RESULTADO OPERATIVO",           value: resumen.resultado_neto,  bg: resumen.resultado_neto >= 0 ? AZUL_BG : ROJO_BG, bold: true },
      { label: "",                               value: null,                    bg: GRIS_BG,    bold: false },
      { label: "Aportes del titular",           value: resumen.aportes_titular, bg: VIOLETA_BG, bold: false },
      { label: "Retiros del titular",           value: resumen.retiros_titular, bg: VIOLETA_BG, bold: false },
      { label: "",                               value: null,                    bg: GRIS_BG,    bold: false },
      { label: "SALDO REAL DE CAJA",            value: resumen.saldo_real,      bg: resumen.saldo_real >= 0 ? AZUL_BG : ROJO_BG, bold: true },
    ];

    kpis.forEach(({ label, value, bg, bold }) => {
      const row = wsR.addRow([label, value]);
      const cL = row.getCell(1), cV = row.getCell(2);
      cL.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cL.font = { bold, color: { argb: "FFFFFFFF" } };
      cL.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      if (value !== null) {
        cV.numFmt = moneyFmt;
        cV.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        cV.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cV.alignment = { vertical: "middle", horizontal: "right" };
      } else {
        cV.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      }
      row.height = 22;
      [cL, cV].forEach(borderAll);
    });

    // Stats
    wsR.addRow([]);
    const sh = wsR.addRow(["ESTADÍSTICAS", ""]);
    wsR.mergeCells(`A${sh.number}:B${sh.number}`);
    sh.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    sh.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sh.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    sh.height = 20;

    [
      ["Órdenes cobradas",       resumen.cantidad_ordenes],
      ["Cobros registrados",     resumen.cantidad_cobros],
      ["Abonos de deuda",        resumen.cantidad_abonos_deuda],
      ["Ventas rápidas",         resumen.cantidad_ventas_rapidas],
      ["Compras registradas",    resumen.cantidad_compras],
      ["Mov. del titular",       resumen.cantidad_movimientos_titular],
      ["Días con actividad",     analisis.dias_con_actividad],
      ["Días positivos",         analisis.dias_positivos],
      ["Días de abastecimiento", analisis.dias_abastecimiento],
      ["Días con pérdida op.",   analisis.dias_perdida_operativa],
      ["Ingreso promedio/día",   analisis.promedio_ingreso_diario],
    ].forEach(([label, val]) => {
      const r = wsR.addRow([label, val]);
      r.getCell(1).fill = r.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS_BG } };
      r.getCell(1).font = GRAY_FONT;
      r.getCell(2).font = { bold: true, color: { argb: "FFFFFFFF" } };
      r.getCell(2).alignment = { horizontal: "right" };
      if (label === "Ingreso promedio/día") { r.getCell(2).numFmt = moneyFmt; }
      [r.getCell(1), r.getCell(2)].forEach(borderAll);
      r.height = 18;
    });

    // ═══════════════════════════════════════════════════════════════════════
    // HOJA 2 — MOVIMIENTOS
    // ═══════════════════════════════════════════════════════════════════════
    const wsMov = wb.addWorksheet("Movimientos", { tabColor: { argb: "FF22c55e" } });
    wsMov.columns = [
      { header: "Fecha",       key: "fecha",       width: 14 },
      { header: "Tipo",        key: "tipo",        width: 18 },
      { header: "Referencia",  key: "referencia",  width: 26 },
      { header: "Descripción", key: "descripcion", width: 44 },
      { header: "Monto",       key: "monto",       width: 18 },
    ];

    wsMov.spliceRows(1, 0, []);
    wsMov.mergeCells("A1:E1");
    const mt = wsMov.getRow(1);
    mt.getCell(1).value = `MOVIMIENTOS  ${fmtDate(desde)} → ${fmtDate(hasta)}`;
    mt.getCell(1).font  = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    mt.getCell(1).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: TITULO_BG } };
    mt.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    mt.height = 26;
    applyHeader(wsMov.getRow(2));

    let totIng = 0, totEgr = 0;
    movimientos.forEach((mov) => {
      const esIng = mov.tipo === "ingreso";
      const sub   = mov.subtipo;
      const monto = Number(mov.monto) || 0;

      const tipoLabel = {
        cobro:           "Cobro",
        abono_deuda:     "Abono Deuda",
        venta_rapida:    "Venta Rápida",
        gasto:           "Gasto",
        compra:          "Compra",
        aporte_titular:  "Aporte Titular",
        retiro_titular:  "Retiro Titular",
      }[sub] || sub;

      const bgMap = {
        cobro: VERDE_BG, abono_deuda: VERDE_BG, venta_rapida: TEAL_BG,
        gasto: ROJO_BG,  compra: NARANJA_BG,
        aporte_titular: VIOLETA_BG, retiro_titular: VIOLETA_BG,
      };
      const accentMap = {
        cobro: "FF22c55e", abono_deuda: "FF22c55e", venta_rapida: "FF2dd4bf",
        gasto: "FFef4444", compra: "FFf97316",
        aporte_titular: "FFa78bfa", retiro_titular: "FFa78bfa",
      };
      const baseMap = {
        cobro: "FF86efac", abono_deuda: "FF86efac", venta_rapida: "FF99f6e4",
        gasto: "FFfca5a5", compra: "FFfdba74",
        aporte_titular: "FFddd6fe", retiro_titular: "FFddd6fe",
      };

      const row = wsMov.addRow({ fecha: fmtDate(mov.fecha), tipo: tipoLabel, referencia: mov.referencia, descripcion: mov.descripcion, monto });
      row.eachCell((cell, col) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgMap[sub] || GRIS_BG } };
        cell.font = { color: { argb: baseMap[sub] || "FF94a3b8" } };
        if (col === 5) { cell.numFmt = moneyFmt; cell.alignment = { horizontal: "right" }; cell.font = { bold: true, color: { argb: accentMap[sub] || "FFFFFFFF" } }; }
        borderAll(cell);
      });
      row.height = 18;
      if (esIng) totIng += monto; else totEgr += monto;
    });

    wsMov.addRow([]);
    const totRow = wsMov.addRow({ fecha: `Ingresos: ${fmtMoney(totIng)}   |   Egresos: ${fmtMoney(totEgr)}   |   Neto: ${fmtMoney(totIng - totEgr)}` });
    wsMov.mergeCells(`A${totRow.number}:E${totRow.number}`);
    totRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITULO_BG } };
    totRow.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    totRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    totRow.height = 22;
    wsMov.views = [{ state: "frozen", ySplit: 2 }];
    wsMov.autoFilter = { from: "A2", to: "E2" };

    // ═══════════════════════════════════════════════════════════════════════
    // HOJA 3 — GASTOS POR CATEGORÍA
    // ═══════════════════════════════════════════════════════════════════════
    const wsCat = wb.addWorksheet("Gastos por Categoría", { tabColor: { argb: "FFef4444" } });
    wsCat.columns = [
      { header: "#", key: "num", width: 6 }, { header: "Categoría", key: "categoria", width: 30 },
      { header: "Total", key: "total", width: 20 }, { header: "% del total", key: "pct", width: 16 },
    ];
    wsCat.spliceRows(1, 0, []);
    wsCat.mergeCells("A1:D1");
    const ct = wsCat.getCell("A1");
    ct.value = "GASTOS OPERATIVOS POR CATEGORÍA";
    ct.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    ct.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFef4444" } };
    ct.alignment = { horizontal: "center", vertical: "middle" };
    wsCat.getRow(1).height = 26;
    applyHeader(wsCat.getRow(2));
    const totCats = porCategoria.reduce((s, c) => s + Number(c.total), 0);
    porCategoria.forEach((cat, idx) => {
      const m = Number(cat.total) || 0;
      const row = wsCat.addRow({ num: idx + 1, categoria: cat.categoria, total: m, pct: totCats > 0 ? m / totCats : 0 });
      const bg = idx % 2 === 0 ? GRIS_BG : ROJO_BG;
      row.eachCell((cell, col) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        cell.font = GRAY_FONT;
        borderAll(cell);
        if (col === 3) { cell.numFmt = moneyFmt; cell.font = { bold: true, color: { argb: "FFfca5a5" } }; cell.alignment = { horizontal: "right" }; }
        if (col === 4) { cell.numFmt = "0.0%"; cell.alignment = { horizontal: "center" }; }
      });
      row.height = 18;
    });
    if (porCategoria.length) {
      const tr = wsCat.addRow({ num: "", categoria: "TOTAL", total: totCats, pct: 1 });
      tr.eachCell((cell, col) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFef4444" } };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        if (col === 3) { cell.numFmt = moneyFmt; cell.alignment = { horizontal: "right" }; }
        if (col === 4) { cell.numFmt = "0.0%"; cell.alignment = { horizontal: "center" }; }
        borderAll(cell);
      });
      tr.height = 20;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOJA 4 — DESGLOSE POR DÍA
    // ═══════════════════════════════════════════════════════════════════════
    const wsDia = wb.addWorksheet("Por Día", { tabColor: { argb: "FF3b82f6" } });
    wsDia.columns = [
      { header: "Fecha", key: "fecha", width: 14 }, { header: "Ingresos", key: "ingresos", width: 18 },
      { header: "Gastos", key: "gastos", width: 18 }, { header: "Compras", key: "compras", width: 18 },
      { header: "Total Egresos", key: "egresos", width: 18 }, { header: "Neto del Día", key: "neto", width: 18 },
      { header: "Tipo de día", key: "tipo_dia", width: 22 },
    ];
    wsDia.spliceRows(1, 0, []);
    wsDia.mergeCells("A1:G1");
    const dt = wsDia.getCell("A1");
    dt.value = "DESGLOSE DIARIO";
    dt.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    dt.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3b82f6" } };
    dt.alignment = { horizontal: "center", vertical: "middle" };
    wsDia.getRow(1).height = 26;
    applyHeader(wsDia.getRow(2));

    const diaMap2 = {};
    (porDia.ingresos || []).forEach(({ dia, total }) => {
      const k = String(dia).slice(0, 10);
      diaMap2[k] = diaMap2[k] || { ingresos: 0, gastos: 0, compras: 0 };
      diaMap2[k].ingresos += Number(total);
    });
    (porDia.gastos || []).forEach(({ dia, total }) => {
      const k = String(dia).slice(0, 10); diaMap2[k] = diaMap2[k] || { ingresos: 0, gastos: 0, compras: 0 }; diaMap2[k].gastos += Number(total);
    });
    (porDia.compras || []).forEach(({ dia, total }) => {
      const k = String(dia).slice(0, 10); diaMap2[k] = diaMap2[k] || { ingresos: 0, gastos: 0, compras: 0 }; diaMap2[k].compras += Number(total);
    });

    const TIPO_DIA_LABEL = {
      positivo: "✓ Positivo", abastecimiento: "↓ Abastecimiento (normal)", perdida_operativa: "⚠ Pérdida operativa", neutro: "= Neutro",
    };

    let si = 0, sg = 0, sc = 0;
    Object.keys(diaMap2).sort().forEach((fecha, idx) => {
      const { ingresos, gastos, compras } = diaMap2[fecha];
      const egresos = gastos + compras;
      const neto    = ingresos - egresos;
      const nSinC   = ingresos - gastos;
      const tipo    = neto > 0 ? "positivo" : neto === 0 ? "neutro" : nSinC >= 0 ? "abastecimiento" : "perdida_operativa";
      si += ingresos; sg += gastos; sc += compras;

      const row = wsDia.addRow({ fecha: fmtDate(fecha), ingresos, gastos, compras, egresos, neto, tipo_dia: TIPO_DIA_LABEL[tipo] });
      const baseBg = idx % 2 === 0 ? GRIS_BG : "FF252d3d";
      row.eachCell((cell, col) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: baseBg } };
        cell.font = col === 1 ? GRAY_FONT : { color: { argb: "FF94a3b8" } };
        if ([2, 3, 4, 5, 6].includes(col)) { cell.numFmt = moneyFmt; cell.alignment = { horizontal: "right" }; }
        if (col === 2 && ingresos > 0) cell.font = { bold: true, color: { argb: "FF22c55e" } };
        if (col === 5 && egresos > 0)  cell.font = { bold: true, color: { argb: "FFef4444" } };
        if (col === 6) cell.font = { bold: true, color: { argb: neto >= 0 ? "FF22c55e" : "FFef4444" } };
        if (col === 7) {
          const c = { positivo: "FF22c55e", abastecimiento: "FF3b82f6", perdida_operativa: "FFef4444", neutro: "FF94a3b8" }[tipo];
          cell.font = { color: { argb: c } };
        }
        borderAll(cell);
      });
      row.height = 18;
    });

    const se = sg + sc;
    const tDia = wsDia.addRow({ fecha: "TOTALES", ingresos: si, gastos: sg, compras: sc, egresos: se, neto: si - se, tipo_dia: "" });
    tDia.eachCell((cell, col) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3b82f6" } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      if ([2, 3, 4, 5, 6].includes(col)) { cell.numFmt = moneyFmt; cell.alignment = { horizontal: "right" }; }
      borderAll(cell);
    });
    tDia.height = 22;
    wsDia.views = [{ state: "frozen", ySplit: 2 }];

    const buffer = await wb.xlsx.writeBuffer();
    return { buffer, desde, hasta };
  },
};

module.exports = FinanzasService;
