const { z } = require("zod");

const createProductoSchema = z.object({
  categoria_id: z.coerce.number().int().positive("La categoria es obligatoria"),
  proveedor_id: z.coerce.number().int().positive().nullable().optional(),
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  codigo: z.string().trim().max(60).nullable().optional(),
  marca: z.string().trim().max(80).nullable().optional(),
  descripcion: z.string().trim().nullable().optional(),
  precio_costo: z.coerce.number().min(0).default(0),
  precio_venta: z.coerce.number().min(0).default(0),
  stock_actual: z.coerce.number().min(0).default(0),
  stock_minimo: z.coerce.number().min(0).default(0),
  unidad: z.string().trim().min(1).max(30).default("unidad"),
});

const updateProductoSchema = createProductoSchema.partial();

const listProductosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  categoria_id: z.coerce.number().int().positive().optional(),
  q: z.string().trim().optional(),
  stock_bajo: z.coerce.boolean().optional(),
});

const ajusteStockSchema = z.object({
  nuevo_stock: z.coerce.number().min(0, "El stock no puede ser negativo"),
  motivo: z.string().trim().min(1, "El motivo es obligatorio").max(255),
});

module.exports = {
  createProductoSchema,
  updateProductoSchema,
  listProductosSchema,
  ajusteStockSchema,
};
