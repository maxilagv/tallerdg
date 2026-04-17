const { z } = require("zod");

const MEDIOS_PAGO = ["efectivo", "tarjeta", "transferencia", "otro"];

const createVentaRapidaSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  medio_pago: z.enum(MEDIOS_PAGO).default("efectivo"),
  notas: z.string().trim().max(500).nullable().optional(),
  items: z
    .array(
      z.object({
        producto_id: z.coerce.number().int().positive().nullable().optional(),
        producto_nombre: z.string().trim().min(1, "El nombre del producto es obligatorio").max(200),
        unidad: z.string().trim().max(50).default("unidad"),
        cantidad: z.coerce.number().positive("La cantidad debe ser mayor a cero"),
        precio_unitario: z.coerce.number().min(0, "El precio no puede ser negativo"),
      })
    )
    .min(1, "Debe incluir al menos un producto"),
});

const listVentasRapidasSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  desde: z.string().optional(),
  hasta: z.string().optional(),
});

module.exports = { createVentaRapidaSchema, listVentasRapidasSchema, MEDIOS_PAGO };
