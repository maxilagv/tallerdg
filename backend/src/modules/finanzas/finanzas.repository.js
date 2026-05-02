const db = require("../../shared/db/knex");

function aplicarCorteCreated(query, column, options = {}) {
  if (options.cajaResetAt) {
    query.where(column, ">=", options.cajaResetAt);
  }
}

function aplicarCorteFechaYCreated(query, fechaColumn, createdColumn, options = {}) {
  if (options.cajaResetFecha) {
    query.where(fechaColumn, ">=", options.cajaResetFecha);
  }
  if (options.cajaResetAt) {
    query.where(createdColumn, ">=", options.cajaResetAt);
  }
}

function buildCorteCreated(column, options = {}) {
  if (!options.cajaResetAt) return { sql: "", params: [] };
  return { sql: ` AND ${column} >= ?`, params: [options.cajaResetAt] };
}

function buildCorteFechaYCreated(fechaColumn, createdColumn, options = {}) {
  const clauses = [];
  const params = [];
  if (options.cajaResetFecha) {
    clauses.push(`${fechaColumn} >= ?`);
    params.push(options.cajaResetFecha);
  }
  if (options.cajaResetAt) {
    clauses.push(`${createdColumn} >= ?`);
    params.push(options.cajaResetAt);
  }
  return {
    sql: clauses.length ? ` AND ${clauses.join(" AND ")}` : "",
    params,
  };
}

/**
 * FinanzasRepository
 * ------------------
 * Capa de acceso a datos del módulo de Caja.
 *
 * FUENTES DE INGRESOS (operativos):
 *   1. pagos          — cobros sobre órdenes de trabajo
 *   2. ventas_rapidas — ventas en caja rápida sin orden
 *
 * FUENTES DE EGRESOS (operativos):
 *   1. gastos  — gastos operativos del taller
 *   2. compras — compras a proveedores
 *
 * MOVIMIENTOS DEL TITULAR (NO operativos):
 *   1. movimientos_caja tipo=aporte_titular  → dinero que entra pero NO es ingreso
 *   2. movimientos_caja tipo=retiro_titular  → dinero que sale pero NO es gasto
 *
 * RESULTADO OPERATIVO = Ingresos - Egresos  (no incluye titular)
 * SALDO REAL DE CAJA  = Resultado Operativo + Aportes - Retiros
 */
const FinanzasRepository = {

  // ── Resumen del período ───────────────────────────────────────────────────
  async getResumen(desde, hasta, options = {}) {
    const cajaIniciaEnCero = options.cajaIniciaEnCero !== false;
    const [
      cobros,
      cobrosPorMetodo,
      cobrosEfectivo,
      gastos,
      gastosEfectivo,
      cobrosEfectivoArrastre,
      gastosEfectivoArrastre,
      compras,
      ventasRapidas,
      ventasRapidasPorMetodo,
      ventasRapidasEfectivo,
      ventasRapidasEfectivoArrastre,
      titular,
      titularArrastre,
    ] = await Promise.all([

      // Cobros de órdenes de trabajo (pagos activos)
      db("pagos as p")
        .join("ordenes as o", "p.orden_id", "o.id")
        .whereNull("p.anulado_at")
        .whereBetween("p.created_at", [`${desde} 00:00:00`, `${hasta} 23:59:59`])
        .modify((q) => aplicarCorteCreated(q, "p.created_at", options))
        .select(
          db.raw("COALESCE(SUM(p.monto), 0) as total"),
          db.raw("COUNT(*) as cantidad_cobros"),
          db.raw("COUNT(DISTINCT p.orden_id) as cantidad_ordenes")
        )
        .first(),

      // Desglose de cobros por método de pago
      db("pagos as p")
        .whereNull("p.anulado_at")
        .whereBetween("p.created_at", [`${desde} 00:00:00`, `${hasta} 23:59:59`])
        .modify((q) => aplicarCorteCreated(q, "p.created_at", options))
        .groupBy("p.metodo")
        .orderBy("p.metodo", "asc")
        .select("p.metodo", db.raw("COALESCE(SUM(p.monto), 0) as total")),

      // Cobros en efectivo (solo para saldo físico de caja)
      db("pagos as p")
        .whereNull("p.anulado_at")
        .where("p.metodo", "efectivo")
        .whereBetween("p.created_at", [`${desde} 00:00:00`, `${hasta} 23:59:59`])
        .modify((q) => aplicarCorteCreated(q, "p.created_at", options))
        .select(db.raw("COALESCE(SUM(p.monto), 0) as total"))
        .first(),

      // Gastos operativos (soft-delete: activo=1)
      db("gastos")
        .where("activo", 1)
        .whereBetween("fecha", [desde, hasta])
        .modify((q) => aplicarCorteFechaYCreated(q, "fecha", "created_at", options))
        .select(db.raw("COALESCE(SUM(monto), 0) as total"))
        .first(),

      db("gastos")
        .where("activo", 1)
        .where("metodo_pago", "efectivo")
        .whereBetween("fecha", [desde, hasta])
        .modify((q) => aplicarCorteFechaYCreated(q, "fecha", "created_at", options))
        .select(db.raw("COALESCE(SUM(monto), 0) as total"))
        .first(),

      db("pagos as p")
        .whereNull("p.anulado_at")
        .where("p.metodo", "efectivo")
        .where("p.created_at", "<", `${desde} 00:00:00`)
        .modify((q) => aplicarCorteCreated(q, "p.created_at", options))
        .select(db.raw("COALESCE(SUM(p.monto), 0) as total"))
        .first(),

      db("gastos")
        .where("activo", 1)
        .where("metodo_pago", "efectivo")
        .where("fecha", "<", desde)
        .modify((q) => aplicarCorteFechaYCreated(q, "fecha", "created_at", options))
        .select(db.raw("COALESCE(SUM(monto), 0) as total"))
        .first(),

      // Compras a proveedores
      db("compras")
        .whereBetween("fecha", [desde, hasta])
        .modify((q) => aplicarCorteFechaYCreated(q, "fecha", "created_at", options))
        .select(
          db.raw("COALESCE(SUM(total), 0) as total"),
          db.raw("COUNT(*) as cantidad")
        )
        .first(),

      // Ventas rápidas (caja rápida — ingresos sin orden de trabajo)
      db("ventas_rapidas")
        .whereBetween("fecha", [desde, hasta])
        .modify((q) => aplicarCorteFechaYCreated(q, "fecha", "created_at", options))
        .select(
          db.raw("COALESCE(SUM(total), 0) as total"),
          db.raw("COUNT(*) as cantidad")
        )
        .first(),

      // Desglose de ventas rápidas por medio de pago
      db("ventas_rapidas")
        .whereBetween("fecha", [desde, hasta])
        .modify((q) => aplicarCorteFechaYCreated(q, "fecha", "created_at", options))
        .groupBy("medio_pago")
        .orderBy("medio_pago", "asc")
        .select("medio_pago as metodo", db.raw("COALESCE(SUM(total), 0) as total")),

      // Ventas rápidas solo en efectivo (para saldo físico de caja)
      db("ventas_rapidas")
        .where("medio_pago", "efectivo")
        .whereBetween("fecha", [desde, hasta])
        .modify((q) => aplicarCorteFechaYCreated(q, "fecha", "created_at", options))
        .select(db.raw("COALESCE(SUM(total), 0) as total"))
        .first(),

      db("ventas_rapidas")
        .where("medio_pago", "efectivo")
        .where("fecha", "<", desde)
        .modify((q) => aplicarCorteFechaYCreated(q, "fecha", "created_at", options))
        .select(db.raw("COALESCE(SUM(total), 0) as total"))
        .first(),

      // Movimientos del titular (aportes y retiros) — NO operativos
      db("movimientos_caja")
        .where("activo", 1)
        .whereBetween("fecha", [desde, hasta])
        .modify((q) => aplicarCorteFechaYCreated(q, "fecha", "created_at", options))
        .select(
          db.raw("COALESCE(SUM(CASE WHEN tipo='aporte_titular' THEN monto ELSE 0 END), 0) as aportes"),
          db.raw("COALESCE(SUM(CASE WHEN tipo='retiro_titular' THEN monto ELSE 0 END), 0) as retiros"),
          db.raw("COUNT(*) as cantidad")
        )
        .first(),

      db("movimientos_caja")
        .where("activo", 1)
        .where("fecha", "<", desde)
        .modify((q) => aplicarCorteFechaYCreated(q, "fecha", "created_at", options))
        .select(
          db.raw("COALESCE(SUM(CASE WHEN tipo='aporte_titular' THEN monto ELSE 0 END), 0) as aportes"),
          db.raw("COALESCE(SUM(CASE WHEN tipo='retiro_titular' THEN monto ELSE 0 END), 0) as retiros")
        )
        .first(),
    ]);

    const totalCobros          = Number(cobros?.total)              || 0;
    const totalVR              = Number(ventasRapidas?.total)       || 0;
    const totalCobrosEfectivo  = Number(cobrosEfectivo?.total)      || 0;
    const totalVREfectivo      = Number(ventasRapidasEfectivo?.total) || 0;
    const totalGastos          = Number(gastos?.total)              || 0;
    const totalGastosEfectivo  = Number(gastosEfectivo?.total)      || 0;
    const totalCobrosEfectivoArrastre = Number(cobrosEfectivoArrastre?.total) || 0;
    const totalGastosEfectivoArrastre = Number(gastosEfectivoArrastre?.total) || 0;
    const totalVREfectivoArrastre = Number(ventasRapidasEfectivoArrastre?.total) || 0;
    const totalCompras         = Number(compras?.total)             || 0;
    const totalAportes         = Number(titular?.aportes)           || 0;
    const totalRetiros         = Number(titular?.retiros)           || 0;
    const totalAportesArrastre = Number(titularArrastre?.aportes)   || 0;
    const totalRetirosArrastre = Number(titularArrastre?.retiros)   || 0;

    const totalIngresos      = totalCobros + totalVR;
    const totalEgresos       = totalGastos + totalCompras;
    const resultadoOperativo = totalIngresos - totalEgresos;
    const netoTitular        = totalAportes - totalRetiros;
    const saldoEfectivoArrastre =
      totalCobrosEfectivoArrastre +
      totalVREfectivoArrastre -
      totalGastosEfectivoArrastre +
      totalAportesArrastre -
      totalRetirosArrastre;

    const saldoEfectivoInicial = cajaIniciaEnCero ? 0 : saldoEfectivoArrastre;

    // Saldo físico en caja = inicio elegido + lo que entró/salió en efectivo
    const saldoEfectivo =
      saldoEfectivoInicial +
      totalCobrosEfectivo +
      totalVREfectivo -
      totalGastosEfectivo +
      totalAportes -
      totalRetiros;

    return {
      // ── Ingresos operativos ───────────────────────────────────────────────
      ingresos:              totalIngresos,
      cobros_ordenes:        totalCobros,
      ventas_rapidas_total:  totalVR,
      // ── Egresos operativos ────────────────────────────────────────────────
      gastos:                totalGastos,
      compras:               totalCompras,
      egresos:               totalEgresos,
      // ── Resultado operativo ───────────────────────────────────────────────
      resultado_neto:        resultadoOperativo,
      // ── Movimientos del titular ────────────────────────────────────────────
      aportes_titular:       totalAportes,
      retiros_titular:       totalRetiros,
      neto_titular:          netoTitular,
      cantidad_movimientos_titular: Number(titular?.cantidad) || 0,
      // ── SALDO FÍSICO DE CAJA (solo efectivo) ─────────────────────────────
      cobros_efectivo:       totalCobrosEfectivo,
      vr_efectivo:           totalVREfectivo,
      gastos_efectivo:       totalGastosEfectivo,
      caja_inicia_en_cero:    cajaIniciaEnCero,
      caja_reset_activo:      Boolean(options.cajaResetAt),
      caja_reset_fecha:       options.cajaResetFecha || null,
      caja_reset_at:          options.cajaResetAt || null,
      saldo_efectivo_inicial: saldoEfectivoInicial,
      saldo_efectivo_arrastre: saldoEfectivoArrastre,
      saldo_efectivo:        saldoEfectivo,
      // ── Compatibilidad ────────────────────────────────────────────────────
      saldo_real:            resultadoOperativo + netoTitular,
      // ── Estadísticas ──────────────────────────────────────────────────────
      cantidad_ordenes:       Number(cobros?.cantidad_ordenes)       || 0,
      cantidad_cobros:        Number(cobros?.cantidad_cobros)        || 0,
      cantidad_compras:       Number(compras?.cantidad)              || 0,
      cantidad_ventas_rapidas: Number(ventasRapidas?.cantidad)       || 0,
      // ── Desgloses ─────────────────────────────────────────────────────────
      desglose_metodos: cobrosPorMetodo.map((item) => ({
        metodo: item.metodo,
        total:  Number(item.total) || 0,
      })),
      desglose_metodos_vr: ventasRapidasPorMetodo.map((item) => ({
        metodo: item.metodo,
        total:  Number(item.total) || 0,
      })),
    };
  },

  // ── Desglose por día (para gráficos) ─────────────────────────────────────
  async getPorDia(desde, hasta, options = {}) {
    const [ingresosCobros, ingresosVR, gastos, compras] = await Promise.all([
      db("pagos as p")
        .whereNull("p.anulado_at")
        .whereBetween("p.created_at", [`${desde} 00:00:00`, `${hasta} 23:59:59`])
        .modify((q) => aplicarCorteCreated(q, "p.created_at", options))
        .select(db.raw("DATE(p.created_at) as dia"), db.raw("COALESCE(SUM(p.monto), 0) as total"))
        .groupByRaw("DATE(p.created_at)")
        .orderBy("dia", "asc"),

      db("ventas_rapidas")
        .whereBetween("fecha", [desde, hasta])
        .modify((q) => aplicarCorteFechaYCreated(q, "fecha", "created_at", options))
        .select(db.raw("fecha as dia"), db.raw("COALESCE(SUM(total), 0) as total"))
        .groupBy("fecha")
        .orderBy("dia", "asc"),

      db("gastos")
        .where("activo", 1)
        .whereBetween("fecha", [desde, hasta])
        .modify((q) => aplicarCorteFechaYCreated(q, "fecha", "created_at", options))
        .select(db.raw("fecha as dia"), db.raw("COALESCE(SUM(monto), 0) as total"))
        .groupBy("fecha")
        .orderBy("dia", "asc"),

      db("compras")
        .whereBetween("fecha", [desde, hasta])
        .modify((q) => aplicarCorteFechaYCreated(q, "fecha", "created_at", options))
        .select(db.raw("fecha as dia"), db.raw("COALESCE(SUM(total), 0) as total"))
        .groupBy("fecha")
        .orderBy("dia", "asc"),
    ]);

    // Fusionar cobros + ventas_rapidas en una única serie de ingresos por día
    const ingresosMap = {};
    ingresosCobros.forEach(({ dia, total }) => {
      const k = String(dia).slice(0, 10);
      ingresosMap[k] = (ingresosMap[k] || 0) + Number(total);
    });
    ingresosVR.forEach(({ dia, total }) => {
      const k = String(dia).slice(0, 10);
      ingresosMap[k] = (ingresosMap[k] || 0) + Number(total);
    });
    const ingresos = Object.entries(ingresosMap)
      .map(([dia, total]) => ({ dia, total }))
      .sort((a, b) => a.dia.localeCompare(b.dia));

    return { ingresos, gastos, compras };
  },

  // ── Movimientos de un mes completo ────────────────────────────────────────
  async getMovimientosMes(mes, anio, options = {}) {
    const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
    const hasta = new Date(anio, mes, 0).toISOString().slice(0, 10);
    return this.getMovimientosTodos(desde, hasta, options);
  },

  // ── Gastos por categoría ──────────────────────────────────────────────────
  async getGastosPorCategoria(desde, hasta, options = {}) {
    return db("gastos as g")
      .join("categorias_gastos as c", "g.categoria_id", "c.id")
      .where("g.activo", 1)
      .whereBetween("g.fecha", [desde, hasta])
      .modify((q) => aplicarCorteFechaYCreated(q, "g.fecha", "g.created_at", options))
      .select("c.nombre as categoria", db.raw("COALESCE(SUM(g.monto), 0) as total"))
      .groupBy("c.id", "c.nombre")
      .orderBy("total", "desc");
  },

  // ── Movimientos con paginación (todas las fuentes) ────────────────────────
  async getMovimientos(desde, hasta, page, limit, options = {}) {
    const offset = (page - 1) * limit;
    const pagoCorte = buildCorteCreated("p.created_at", options);
    const vrCorte = buildCorteFechaYCreated("vr.fecha", "vr.created_at", options);
    const gastoCorte = buildCorteFechaYCreated("g.fecha", "g.created_at", options);
    const compraCorte = buildCorteFechaYCreated("c.fecha", "c.created_at", options);
    const titularCorte = buildCorteFechaYCreated("mc.fecha", "mc.created_at", options);
    const vrCountCorte = buildCorteFechaYCreated("fecha", "created_at", options);
    const gastoCountCorte = buildCorteFechaYCreated("fecha", "created_at", options);
    const compraCountCorte = buildCorteFechaYCreated("fecha", "created_at", options);
    const titularCountCorte = buildCorteFechaYCreated("fecha", "created_at", options);
    const sql = `
      SELECT * FROM (
        SELECT 'ingreso' AS tipo, 'cobro' AS subtipo,
               o.numero AS referencia, p.monto AS monto, p.created_at AS fecha,
               CONCAT(c.apellido, ', ', c.nombre, ' · ', v.patente, ' · ', p.metodo) AS descripcion
        FROM pagos p
        JOIN ordenes o ON p.orden_id = o.id JOIN clientes c ON o.cliente_id = c.id
        JOIN vehiculos v ON o.vehiculo_id = v.id
        WHERE p.anulado_at IS NULL AND p.created_at BETWEEN ? AND ?${pagoCorte.sql}

        UNION ALL

        SELECT 'ingreso', 'venta_rapida',
               CONCAT('Caja Rápida #', vr.id), vr.total, vr.fecha,
               CONCAT('Venta rápida · ',
                 CASE vr.medio_pago WHEN 'efectivo' THEN 'Efectivo'
                   WHEN 'tarjeta' THEN 'Tarjeta' WHEN 'transferencia' THEN 'Transferencia'
                   ELSE 'Otro' END,
                 CASE WHEN vr.notas IS NOT NULL AND vr.notas != ''
                      THEN CONCAT(' · ', vr.notas) ELSE '' END)
        FROM ventas_rapidas vr WHERE vr.fecha BETWEEN ? AND ?
          ${vrCorte.sql}

        UNION ALL

        SELECT 'egreso', 'gasto', cg.nombre, g.monto, g.fecha, g.descripcion
        FROM gastos g JOIN categorias_gastos cg ON g.categoria_id = cg.id
        WHERE g.activo = 1 AND g.fecha BETWEEN ? AND ?${gastoCorte.sql}

        UNION ALL

        SELECT 'egreso', 'compra',
               COALESCE(p.nombre, 'Sin proveedor'), c.total, c.fecha,
               CONCAT('Compra a ', COALESCE(p.nombre, 'Sin proveedor'))
        FROM compras c LEFT JOIN proveedores p ON c.proveedor_id = p.id
        WHERE c.fecha BETWEEN ? AND ?${compraCorte.sql}

        UNION ALL

        SELECT
          CASE mc.tipo WHEN 'aporte_titular' THEN 'ingreso' ELSE 'egreso' END,
          mc.tipo,
          CASE mc.tipo WHEN 'aporte_titular' THEN 'Aporte del titular'
                       ELSE 'Retiro del titular' END,
          mc.monto, mc.fecha,
          CONCAT(mc.concepto,
            CASE WHEN mc.referencia IS NOT NULL AND mc.referencia != ''
                 THEN CONCAT(' · Ref: ', mc.referencia) ELSE '' END)
        FROM movimientos_caja mc WHERE mc.activo = 1 AND mc.fecha BETWEEN ? AND ?
          ${titularCorte.sql}

      ) mov ORDER BY fecha DESC, tipo ASC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.raw(sql, [
      `${desde} 00:00:00`, `${hasta} 23:59:59`,
      ...pagoCorte.params,
      desde, hasta, ...vrCorte.params,
      desde, hasta, ...gastoCorte.params,
      desde, hasta, ...compraCorte.params,
      desde, hasta, ...titularCorte.params,
      limit, offset,
    ]);

    const countSql = `
      SELECT (
        SELECT COUNT(*) FROM pagos p WHERE p.anulado_at IS NULL AND p.created_at BETWEEN ? AND ?${pagoCorte.sql}
      ) + (SELECT COUNT(*) FROM ventas_rapidas WHERE fecha BETWEEN ? AND ?${vrCountCorte.sql})
        + (SELECT COUNT(*) FROM gastos WHERE activo=1 AND fecha BETWEEN ? AND ?${gastoCountCorte.sql})
        + (SELECT COUNT(*) FROM compras WHERE fecha BETWEEN ? AND ?${compraCountCorte.sql})
        + (SELECT COUNT(*) FROM movimientos_caja WHERE activo=1 AND fecha BETWEEN ? AND ?${titularCountCorte.sql})
      AS total
    `;
    const [countRows] = await db.raw(countSql, [
      `${desde} 00:00:00`, `${hasta} 23:59:59`,
      ...pagoCorte.params,
      desde, hasta, ...vrCountCorte.params,
      desde, hasta, ...gastoCountCorte.params,
      desde, hasta, ...compraCountCorte.params,
      desde, hasta, ...titularCountCorte.params,
    ]);

    return { rows, total: Number(countRows?.[0]?.total) || 0, page, limit };
  },

  // ── Detalle cronologico de movimientos (para vista diaria de caja) ───────
  async getMovimientosDetalle(desde, hasta, options = {}) {
    const pagoCorte = buildCorteCreated("p.created_at", options);
    const vrCorte = buildCorteFechaYCreated("vr.fecha", "vr.created_at", options);
    const gastoCorte = buildCorteFechaYCreated("g.fecha", "g.created_at", options);
    const compraCorte = buildCorteFechaYCreated("c.fecha", "c.created_at", options);
    const titularCorte = buildCorteFechaYCreated("mc.fecha", "mc.created_at", options);
    const sql = `
      SELECT * FROM (
        SELECT 'ingreso' AS tipo, 'cobro' AS subtipo,
               o.numero AS referencia, p.monto AS monto, DATE(p.created_at) AS fecha,
               p.created_at AS fecha_hora, p.created_at AS registrado_at,
               CONCAT(c.apellido, ', ', c.nombre, ' - ', v.patente, ' - ', p.metodo) AS descripcion,
               p.metodo AS metodo_cobro
        FROM pagos p
        JOIN ordenes o ON p.orden_id = o.id JOIN clientes c ON o.cliente_id = c.id
        JOIN vehiculos v ON o.vehiculo_id = v.id
        WHERE p.anulado_at IS NULL AND p.created_at BETWEEN ? AND ?${pagoCorte.sql}

        UNION ALL

        SELECT 'ingreso', 'venta_rapida',
               CONCAT('Caja Rapida #', vr.id), vr.total, vr.fecha,
               TIMESTAMP(vr.fecha, COALESCE(TIME(vr.created_at), '00:00:00')) AS fecha_hora,
               vr.created_at AS registrado_at,
               CONCAT('Venta rapida',
                 CASE WHEN vi.items IS NOT NULL AND vi.items != ''
                      THEN CONCAT(' - ', vi.items) ELSE '' END,
                 ' - ',
                 CASE vr.medio_pago WHEN 'efectivo' THEN 'Efectivo'
                   WHEN 'tarjeta' THEN 'Tarjeta' WHEN 'transferencia' THEN 'Transferencia'
                   ELSE 'Otro' END,
                 CASE WHEN vr.notas IS NOT NULL AND vr.notas != ''
                      THEN CONCAT(' - ', vr.notas) ELSE '' END),
               vr.medio_pago
        FROM ventas_rapidas vr
        LEFT JOIN (
          SELECT venta_id, GROUP_CONCAT(producto_nombre ORDER BY id SEPARATOR ', ') AS items
          FROM venta_rapida_items
          GROUP BY venta_id
        ) vi ON vi.venta_id = vr.id
        WHERE vr.fecha BETWEEN ? AND ?
          ${vrCorte.sql}

        UNION ALL

        SELECT 'egreso', 'gasto', cg.nombre, g.monto, g.fecha,
               TIMESTAMP(g.fecha, COALESCE(TIME(g.created_at), '00:00:00')) AS fecha_hora,
               g.created_at AS registrado_at,
               g.descripcion, g.metodo_pago
        FROM gastos g JOIN categorias_gastos cg ON g.categoria_id = cg.id
        WHERE g.activo = 1 AND g.fecha BETWEEN ? AND ?${gastoCorte.sql}

        UNION ALL

        SELECT 'egreso', 'compra',
               COALESCE(p.nombre, 'Sin proveedor'), c.total, c.fecha,
               TIMESTAMP(c.fecha, COALESCE(TIME(c.created_at), '00:00:00')) AS fecha_hora,
               c.created_at AS registrado_at,
               CONCAT('Compra a ', COALESCE(p.nombre, 'Sin proveedor')), NULL
        FROM compras c LEFT JOIN proveedores p ON c.proveedor_id = p.id
        WHERE c.fecha BETWEEN ? AND ?${compraCorte.sql}

        UNION ALL

        SELECT
          CASE mc.tipo WHEN 'aporte_titular' THEN 'ingreso' ELSE 'egreso' END,
          mc.tipo,
          CASE mc.tipo WHEN 'aporte_titular' THEN 'Ingreso manual'
                       ELSE 'Retiro de caja' END,
          mc.monto, mc.fecha,
          TIMESTAMP(mc.fecha, COALESCE(TIME(mc.created_at), '00:00:00')) AS fecha_hora,
          mc.created_at AS registrado_at,
          CONCAT(mc.concepto,
            CASE WHEN mc.referencia IS NOT NULL AND mc.referencia != ''
                 THEN CONCAT(' - Ref: ', mc.referencia) ELSE '' END),
          NULL
        FROM movimientos_caja mc WHERE mc.activo = 1 AND mc.fecha BETWEEN ? AND ?${titularCorte.sql}

      ) mov ORDER BY fecha ASC, fecha_hora ASC, tipo ASC
    `;

    const [rows] = await db.raw(sql, [
      `${desde} 00:00:00`, `${hasta} 23:59:59`,
      ...pagoCorte.params,
      desde, hasta, ...vrCorte.params,
      desde, hasta, ...gastoCorte.params,
      desde, hasta, ...compraCorte.params,
      desde, hasta, ...titularCorte.params,
    ]);
    return rows;
  },

  // ── Todos los movimientos sin paginación (para export Excel) ─────────────
  async getMovimientosTodos(desde, hasta, options = {}) {
    const pagoCorte = buildCorteCreated("p.created_at", options);
    const vrCorte = buildCorteFechaYCreated("vr.fecha", "vr.created_at", options);
    const gastoCorte = buildCorteFechaYCreated("g.fecha", "g.created_at", options);
    const compraCorte = buildCorteFechaYCreated("c.fecha", "c.created_at", options);
    const titularCorte = buildCorteFechaYCreated("mc.fecha", "mc.created_at", options);
    const sql = `
      SELECT * FROM (
        SELECT 'ingreso' AS tipo, 'cobro' AS subtipo,
               o.numero AS referencia, p.monto AS monto, p.created_at AS fecha,
               CONCAT(c.apellido, ', ', c.nombre, ' · ', v.patente) AS descripcion,
               p.metodo AS metodo_cobro
        FROM pagos p JOIN ordenes o ON p.orden_id = o.id
        JOIN clientes c ON o.cliente_id = c.id JOIN vehiculos v ON o.vehiculo_id = v.id
        WHERE p.anulado_at IS NULL AND p.created_at BETWEEN ? AND ?${pagoCorte.sql}

        UNION ALL

        SELECT 'ingreso', 'venta_rapida', CONCAT('Caja Rápida #', vr.id),
               vr.total, vr.fecha,
               CONCAT('Venta rápida · ',
                 CASE vr.medio_pago WHEN 'efectivo' THEN 'Efectivo'
                   WHEN 'tarjeta' THEN 'Tarjeta' WHEN 'transferencia' THEN 'Transferencia'
                   ELSE 'Otro' END,
                 CASE WHEN vr.notas IS NOT NULL AND vr.notas != ''
                      THEN CONCAT(' · ', vr.notas) ELSE '' END),
               vr.medio_pago
        FROM ventas_rapidas vr WHERE vr.fecha BETWEEN ? AND ?${vrCorte.sql}

        UNION ALL

        SELECT 'egreso', 'gasto', cg.nombre, g.monto, g.fecha, g.descripcion, g.metodo_pago
        FROM gastos g JOIN categorias_gastos cg ON g.categoria_id = cg.id
        WHERE g.activo = 1 AND g.fecha BETWEEN ? AND ?${gastoCorte.sql}

        UNION ALL

        SELECT 'egreso', 'compra', COALESCE(p.nombre, 'Sin proveedor'),
               c.total, c.fecha,
               CONCAT('Compra a ', COALESCE(p.nombre, 'Sin proveedor')), NULL
        FROM compras c LEFT JOIN proveedores p ON c.proveedor_id = p.id
        WHERE c.fecha BETWEEN ? AND ?${compraCorte.sql}

        UNION ALL

        SELECT
          CASE mc.tipo WHEN 'aporte_titular' THEN 'ingreso' ELSE 'egreso' END,
          mc.tipo,
          CASE mc.tipo WHEN 'aporte_titular' THEN 'Aporte del titular'
                       ELSE 'Retiro del titular' END,
          mc.monto, mc.fecha,
          CONCAT(mc.concepto,
            CASE WHEN mc.referencia IS NOT NULL AND mc.referencia != ''
                 THEN CONCAT(' · Ref: ', mc.referencia) ELSE '' END),
          NULL
        FROM movimientos_caja mc WHERE mc.activo = 1 AND mc.fecha BETWEEN ? AND ?${titularCorte.sql}

      ) mov ORDER BY fecha DESC, tipo ASC
    `;

    const [rows] = await db.raw(sql, [
      `${desde} 00:00:00`, `${hasta} 23:59:59`,
      ...pagoCorte.params,
      desde, hasta, ...vrCorte.params,
      desde, hasta, ...gastoCorte.params,
      desde, hasta, ...compraCorte.params,
      desde, hasta, ...titularCorte.params,
    ]);
    return rows;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MOVIMIENTOS DEL TITULAR — CRUD
  // ─────────────────────────────────────────────────────────────────────────

  /** Lista paginada de movimientos del titular con filtros opcionales */
  async getMovimientosTitular(params = {}) {
    const { desde, hasta, page = 1, limit = 30 } = params;
    let q = db("movimientos_caja as mc")
      .leftJoin("empleados as e", "mc.empleado_id", "e.id")
      .where("mc.activo", 1)
      .modify((query) => aplicarCorteFechaYCreated(query, "mc.fecha", "mc.created_at", params))
      .orderBy("mc.fecha", "desc")
      .orderBy("mc.id", "desc")
      .select(
        "mc.*",
        db.raw("CONCAT(e.nombre, ' ', e.apellido) as empleado_nombre")
      );

    if (desde) q = q.where("mc.fecha", ">=", desde);
    if (hasta) q = q.where("mc.fecha", "<=", hasta);

    const total  = await q.clone().count("* as cnt").first();
    const rows   = await q.limit(limit).offset((page - 1) * limit);
    return { rows, total: Number(total?.cnt) || 0, page, limit };
  },

  /** Crear un movimiento del titular */
  async crearMovimientoTitular(data) {
    const [id] = await db("movimientos_caja").insert(data);
    return db("movimientos_caja").where("id", id).first();
  },

  /** Actualizar un movimiento del titular */
  async actualizarMovimientoTitular(id, data) {
    await db("movimientos_caja").where({ id, activo: 1 }).update(data);
    return db("movimientos_caja").where("id", id).first();
  },

  /** Soft delete de un movimiento del titular */
  async eliminarMovimientoTitular(id) {
    return db("movimientos_caja")
      .where({ id, activo: 1 })
      .update({ activo: 0, updated_at: db.fn.now() });
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ANÁLISIS INTELIGENTE — datos crudos para el service
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retorna todos los datos necesarios para que el service compute
   * el análisis inteligente del período.
   */
  async getAnalisisDatos(desde, hasta, options = {}) {
    const [porDia, porCategoria, resumen] = await Promise.all([
      this.getPorDia(desde, hasta, options),
      this.getGastosPorCategoria(desde, hasta, options),
      this.getResumen(desde, hasta, options),
    ]);
    return { porDia, porCategoria, resumen };
  },
};

module.exports = FinanzasRepository;
