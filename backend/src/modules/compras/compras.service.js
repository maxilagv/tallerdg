const { z } = require("zod");
const AppError = require("../../shared/errors/AppError");
const ComprasRepository = require("./compras.repository");
const { createCompraSchema, listComprasSchema } = require("./compras.validation");

const idSchema = z.coerce.number().int().positive();

function parseId(value) {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) throw new AppError("Identificador inválido.", 400, "VALIDATION_ERROR");
  return parsed.data;
}

const ComprasService = {
  async listar(query) {
    const parsed = listComprasSchema.safeParse(query);
    if (!parsed.success) throw new AppError("Parámetros inválidos.", 400, "VALIDATION_ERROR");
    return ComprasRepository.findAll(parsed.data);
  },

  async obtener(id) {
    const compraId = parseId(id);
    const compra = await ComprasRepository.findById(compraId);
    if (!compra) throw new AppError("Compra no encontrada.", 404, "NOT_FOUND");
    return compra;
  },

  async crear(data, empleadoId) {
    const parsed = createCompraSchema.safeParse(data);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos inválidos.", 400, "VALIDATION_ERROR");
    }

    const {
      items,
      proveedor_id,
      origen_tipo = proveedor_id ? "proveedor" : "directa",
      origen_nombre,
      actualiza_stock = true,
      fecha,
      notas,
    } = parsed.data;

    // Calcular total de la compra
    const total = items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0);

    const compraData = {
      proveedor_id: origen_tipo === "proveedor" ? proveedor_id || null : null,
      origen_tipo,
      origen_nombre: origen_tipo === "casa_repuestos" ? origen_nombre || null : null,
      actualiza_stock,
      fecha,
      total,
      notas: notas || null,
      empleado_id: empleadoId || null,
    };

    const compraId = await ComprasRepository.create(compraData, items);
    return ComprasRepository.findById(compraId);
  },

  async eliminar(id) {
    const compraId = parseId(id);
    const existing = await ComprasRepository.findById(compraId);
    if (!existing) throw new AppError("Compra no encontrada.", 404, "NOT_FOUND");
    await ComprasRepository.delete(compraId);
  },
};

module.exports = ComprasService;
