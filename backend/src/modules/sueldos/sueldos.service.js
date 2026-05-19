const { z } = require("zod");
const AppError = require("../../shared/errors/AppError");
const SueldosRepository = require("./sueldos.repository");
const {
  upsertConfigSchema,
  abrirPeriodoSchema,
  actualizarPeriodoSchema,
  adelantoSchema,
  descuentoSchema,
  anularAdelantoSchema,
  anularDescuentoSchema,
  historialSchema,
} = require("./sueldos.validation");

const idSchema = z.coerce.number().int().positive();
const metodoPagoSchema = z.enum([
  "efectivo",
  "transferencia",
  "tarjeta_debito",
  "tarjeta_credito",
  "cheque",
]);

function parseId(value) {
  const result = idSchema.safeParse(value);
  if (!result.success) {
    throw new AppError("Identificador invalido.", 400, "VALIDATION_ERROR");
  }
  return result.data;
}

function toDateOnly(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value || "").slice(0, 10);
}

function daysInclusive(inicio, fin) {
  const start = new Date(`${toDateOnly(inicio)}T12:00:00`);
  const end = new Date(`${toDateOnly(fin)}T12:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.max(diff, 1);
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function calcularDescuento(periodo, data) {
  const diasPeriodo = daysInclusive(periodo.fecha_inicio, periodo.fecha_fin);
  const valorDia = roundMoney(Number(periodo.sueldo_base) / diasPeriodo);

  if (data.tipo === "falta") {
    return {
      valor_dia: valorDia,
      valor_hora: null,
      monto: roundMoney(valorDia * Number(data.cantidad)),
    };
  }

  const valorHora = roundMoney(valorDia / Number(data.horas_jornada));
  return {
    valor_dia: valorDia,
    valor_hora: valorHora,
    monto: roundMoney(valorHora * Number(data.cantidad)),
  };
}

const SueldosService = {
  async getResumen() {
    return SueldosRepository.getResumenEmpleados();
  },

  async getConfig(empleadoId) {
    const id = parseId(empleadoId);
    return SueldosRepository.getConfig(id);
  },

  async upsertConfig(empleadoId, data) {
    const id = parseId(empleadoId);
    const parsed = upsertConfigSchema.safeParse(data);
    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }
    return SueldosRepository.upsertConfig(id, parsed.data);
  },

  async abrirPeriodo(empleadoId, data) {
    const id = parseId(empleadoId);

    const config = await SueldosRepository.getConfig(id);
    if (!config) {
      throw new AppError(
        "El empleado no tiene sueldo configurado. Configura el sueldo primero.",
        400,
        "NO_CONFIG"
      );
    }

    const yaAbierto = await SueldosRepository.getPeriodoAbierto(id);
    if (yaAbierto) {
      throw new AppError(
        "Este empleado ya tiene un periodo abierto. Liquidalo antes de abrir uno nuevo.",
        409,
        "PERIODO_YA_ABIERTO"
      );
    }

    const parsed = abrirPeriodoSchema.safeParse(data);
    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }

    return SueldosRepository.abrirPeriodo(id, parsed.data.fecha_inicio);
  },

  async actualizarPeriodo(periodoId, data) {
    const id = parseId(periodoId);
    const periodo = await SueldosRepository.getPeriodoById(id);
    if (!periodo) {
      throw new AppError("Periodo no encontrado.", 404, "NOT_FOUND");
    }
    if (periodo.estado === "pagado") {
      throw new AppError("No se puede editar un periodo ya liquidado.", 400, "PERIODO_CERRADO");
    }

    const parsed = actualizarPeriodoSchema.safeParse(data);
    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }
    if (!Object.keys(parsed.data).length) {
      throw new AppError("Sin campos para actualizar.", 400, "VALIDATION_ERROR");
    }

    const fechaInicio = parsed.data.fecha_inicio || toDateOnly(periodo.fecha_inicio);
    const fechaFin = parsed.data.fecha_fin || toDateOnly(periodo.fecha_fin);
    if (fechaFin < fechaInicio) {
      throw new AppError("La fecha de cierre no puede ser anterior al inicio.", 400, "VALIDATION_ERROR");
    }

    return SueldosRepository.updatePeriodo(id, parsed.data);
  },

  async liquidar(periodoId, data, empleadoAdminId) {
    const id = parseId(periodoId);
    const metodo = metodoPagoSchema.safeParse(data?.metodo_pago || "efectivo");
    if (!metodo.success) {
      throw new AppError("Metodo de pago invalido.", 400, "VALIDATION_ERROR");
    }

    try {
      return await SueldosRepository.liquidarPeriodo(id, empleadoAdminId, metodo.data);
    } catch (err) {
      throw new AppError(err.message, 400, "LIQUIDACION_ERROR");
    }
  },

  async registrarAdelanto(periodoId, data, registradoPorId) {
    const id = parseId(periodoId);

    const periodo = await SueldosRepository.getPeriodoById(id);
    if (!periodo) throw new AppError("Periodo no encontrado.", 404, "NOT_FOUND");
    if (periodo.estado === "pagado") {
      throw new AppError("El periodo ya fue liquidado.", 400, "PERIODO_CERRADO");
    }

    const parsed = adelantoSchema.safeParse(data);
    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const adelantos = await SueldosRepository.getAdelantosDePeriodo(id);
    const totalAdelantos = adelantos.reduce((sum, adelanto) => sum + Number(adelanto.monto), 0);
    const saldoDisponible = Number(periodo.sueldo_base) - totalAdelantos;
    const supera = parsed.data.monto > saldoDisponible;

    const adelanto = await SueldosRepository.registrarAdelanto(
      id,
      parsed.data,
      registradoPorId
    );

    return { adelanto, supera_saldo: supera, saldo_disponible: saldoDisponible };
  },

  async registrarDescuento(periodoId, data, registradoPorId) {
    const id = parseId(periodoId);

    const periodo = await SueldosRepository.getPeriodoById(id);
    if (!periodo) throw new AppError("Periodo no encontrado.", 404, "NOT_FOUND");
    if (periodo.estado === "pagado") {
      throw new AppError("El periodo ya fue liquidado.", 400, "PERIODO_CERRADO");
    }

    const parsed = descuentoSchema.safeParse(data);
    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const calculo = calcularDescuento(periodo, parsed.data);
    const descuentos = await SueldosRepository.getDescuentosDePeriodo(id);
    const totalDescuentos = descuentos.reduce((sum, descuento) => sum + Number(descuento.monto), 0);
    const adelantos = await SueldosRepository.getAdelantosDePeriodo(id);
    const totalAdelantos = adelantos.reduce((sum, adelanto) => sum + Number(adelanto.monto), 0);
    const saldoDisponible = Number(periodo.sueldo_base) - totalAdelantos - totalDescuentos;

    const descuento = await SueldosRepository.registrarDescuento(
      id,
      {
        ...parsed.data,
        fecha: parsed.data.fecha || new Date().toISOString().slice(0, 10),
        ...calculo,
      },
      registradoPorId
    );

    return {
      descuento,
      monto_calculado: calculo.monto,
      valor_dia: calculo.valor_dia,
      valor_hora: calculo.valor_hora,
      saldo_disponible: saldoDisponible,
    };
  },

  async anularAdelanto(adelantoId, data, anuladoPorId) {
    const id = parseId(adelantoId);
    const parsed = anularAdelantoSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }

    if (!anuladoPorId) {
      throw new AppError("No se pudo identificar al usuario que anula el adelanto.", 401, "UNAUTHORIZED");
    }

    try {
      return await SueldosRepository.anularAdelanto(id, parsed.data, anuladoPorId);
    } catch (err) {
      const status = err.message === "Adelanto no encontrado." ? 404 : 400;
      throw new AppError(err.message, status, "ADELANTO_ANULACION_ERROR");
    }
  },

  async anularDescuento(descuentoId, data, anuladoPorId) {
    const id = parseId(descuentoId);
    const parsed = anularDescuentoSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }

    if (!anuladoPorId) {
      throw new AppError("No se pudo identificar al usuario que anula el descuento.", 401, "UNAUTHORIZED");
    }

    try {
      return await SueldosRepository.anularDescuento(id, parsed.data, anuladoPorId);
    } catch (err) {
      const status = err.message === "Descuento no encontrado." ? 404 : 400;
      throw new AppError(err.message, status, "DESCUENTO_ANULACION_ERROR");
    }
  },

  async getHistorial(empleadoId, query) {
    const id = parseId(empleadoId);
    const parsed = historialSchema.safeParse(query);
    if (!parsed.success) {
      throw new AppError("Parametros invalidos.", 400, "VALIDATION_ERROR");
    }
    return SueldosRepository.getHistorialEmpleado(id, parsed.data);
  },

  async getPeriodosVencidos() {
    return SueldosRepository.getPeriodosVencidos();
  },
};

module.exports = SueldosService;
