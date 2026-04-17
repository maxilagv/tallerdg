const { z } = require("zod");
const VehiculosRepository = require("./vehiculos.repository");
const ClientesRepository = require("../clientes/clientes.repository");
const AppError = require("../../shared/errors/AppError");
const {
  createVehiculoSchema,
  updateVehiculoSchema,
  listVehiculosSchema,
} = require("./vehiculos.validation");

const idSchema = z.coerce.number().int().positive();

function parseId(value) {
  const parsed = idSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError("Identificador invalido.", 400, "VALIDATION_ERROR");
  }

  return parsed.data;
}

const VehiculosService = {
  async listar(query) {
    const parsed = listVehiculosSchema.safeParse(query);

    if (!parsed.success) {
      throw new AppError("Parametros invalidos.", 400, "VALIDATION_ERROR");
    }

    return VehiculosRepository.findAll(parsed.data);
  },

  async obtener(id) {
    const vehiculoId = parseId(id);
    const vehiculo = await VehiculosRepository.findById(vehiculoId);

    if (!vehiculo) {
      throw new AppError("Vehiculo no encontrado.", 404, "NOT_FOUND");
    }

    const [historial, stats] = await Promise.all([
      VehiculosRepository.getHistorial(vehiculoId),
      VehiculosRepository.getStats(vehiculoId),
    ]);

    return {
      ...vehiculo,
      historial,
      stats: {
        total_visitas: Number(stats?.total_visitas) || 0,
        total_facturado: Number(stats?.total_facturado) || 0,
        ultima_visita: stats?.ultima_visita || null,
      },
    };
  },

  async historial(id) {
    const vehiculoId = parseId(id);
    const vehiculo = await VehiculosRepository.findById(vehiculoId);

    if (!vehiculo) {
      throw new AppError("Vehiculo no encontrado.", 404, "NOT_FOUND");
    }

    return VehiculosRepository.getHistorial(vehiculoId);
  },

  async crear(data) {
    const parsed = createVehiculoSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const cliente = await ClientesRepository.findById(parsed.data.cliente_id);

    if (!cliente) {
      throw new AppError("El cliente no existe.", 404, "NOT_FOUND");
    }

    const existing = await VehiculosRepository.findByPatente(parsed.data.patente);

    if (existing) {
      throw new AppError(
        `La patente ${parsed.data.patente} ya esta registrada.`,
        409,
        "DUPLICATE_PATENTE"
      );
    }

    return VehiculosRepository.create(parsed.data);
  },

  async actualizar(id, data) {
    const vehiculoId = parseId(id);
    const existing = await VehiculosRepository.findById(vehiculoId);

    if (!existing) {
      throw new AppError("Vehiculo no encontrado.", 404, "NOT_FOUND");
    }

    const parsed = updateVehiculoSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }

    return VehiculosRepository.update(vehiculoId, parsed.data);
  },

  async eliminar(id) {
    const vehiculoId = parseId(id);
    const existing = await VehiculosRepository.findById(vehiculoId);

    if (!existing) {
      throw new AppError("Vehiculo no encontrado.", 404, "NOT_FOUND");
    }

    await VehiculosRepository.softDelete(vehiculoId);
  },

  async buscarPorPatente(patente) {
    if (!patente || typeof patente !== "string") return null;
    const normalizada = patente.replace(/\s+/g, "").toUpperCase().trim();
    if (normalizada.length < 6) return null;
    const vehiculo = await VehiculosRepository.findByPatente(normalizada);
    return vehiculo || null;
  },
};

module.exports = VehiculosService;
