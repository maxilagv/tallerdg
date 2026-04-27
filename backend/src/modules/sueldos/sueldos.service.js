const { z } = require("zod");
const AppError = require("../../shared/errors/AppError");
const SueldosRepository = require("./sueldos.repository");
const {
  upsertConfigSchema,
  abrirPeriodoSchema,
  actualizarPeriodoSchema,
  adelantoSchema,
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
