const { z } = require("zod");

const compraItemSchema = z.object({
  producto_id:     z.number().int().positive("El producto es obligatorio"),
  cantidad:        z.number().positive("La cantidad debe ser mayor a cero"),
  precio_unitario: z.number().min(0, "El precio no puede ser negativo"),
});

const createCompraSchema = z.object({
  proveedor_id: z.number().int().positive().nullable().optional(),
  fecha:        z.string().min(1, "La fecha es obligatoria"),
  notas:        z.string().trim().nullable().optional(),
  items:        z.array(compraItemSchema).min(1, "Agregá al menos un producto a la compra"),
});

const listComprasSchema = z.object({
  page:         z.coerce.number().int().min(1).default(1),
  limit:        z.coerce.number().int().min(1).max(100).default(20),
  proveedor_id: z.coerce.number().int().positive().optional(),
  desde:        z.string().optional(),
  hasta:        z.string().optional(),
});

module.exports = { createCompraSchema, listComprasSchema };
