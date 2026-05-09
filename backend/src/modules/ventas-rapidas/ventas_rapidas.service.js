const { z } = require("zod");
const db = require("../../shared/db/knex");
const AppError = require("../../shared/errors/AppError");
const { generarVentaRapidaPDF } = require("../../shared/pdf/venta_rapida.template");
const VentasRapidasRepository = require("./ventas_rapidas.repository");
const {
  createVentaRapidaSchema,
  listVentasRapidasSchema,
} = require("./ventas_rapidas.validation");

const idSchema = z.coerce.number().int().positive();

function parseId(value) {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) throw new AppError("Identificador inválido.", 400, "VALIDATION_ERROR");
  return parsed.data;
}

const VentasRapidasService = {
  async listar(query) {
    const parsed = listVentasRapidasSchema.safeParse(query);
    if (!parsed.success) throw new AppError("Parámetros inválidos.", 400, "VALIDATION_ERROR");
    return VentasRapidasRepository.findAll(parsed.data);
  },

  async obtener(id) {
    const ventaId = parseId(id);
    const venta = await VentasRapidasRepository.findById(ventaId);
    if (!venta) throw new AppError("Venta no encontrada.", 404, "NOT_FOUND");
    return venta;
  },

  async saldoCajaHoy() {
    return VentasRapidasRepository.saldoCajaHoy();
  },

  async crear(data, empleadoId) {
    const parsed = createVentaRapidaSchema.safeParse(data);
    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos inválidos.",
        400,
        "VALIDATION_ERROR"
      );
    }
    const { items, ...ventaData } = parsed.data;
    const ventaId = await VentasRapidasRepository.create(ventaData, items, empleadoId);
    return VentasRapidasRepository.findById(ventaId);
  },

  async generarComprobante(id) {
    const venta = await this.obtener(id);
    const rows = await db("configuracion").select("clave", "valor");
    const configuracion = Object.fromEntries(rows.map((row) => [row.clave, row.valor]));
    const pdfBuffer = await generarVentaRapidaPDF(venta, configuracion);

    return {
      numero: venta.id,
      pdfBuffer,
    };
  },
};

module.exports = VentasRapidasService;
