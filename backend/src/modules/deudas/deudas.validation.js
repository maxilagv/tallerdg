const { z } = require("zod");

const listDeudasSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cliente_id: z.coerce.number().int().positive().optional(),
  estado: z.enum(["pendiente", "parcial", "pagada"]).optional(),
  q: z.string().trim().optional(),
});

const createDeudaSchema = z.object({
  cliente_id: z.coerce.number().int().positive("El cliente es obligatorio"),
  concepto: z.string().trim().min(1, "El concepto es obligatorio").max(255),
  monto_original: z.coerce.number().positive("El monto debe ser mayor a 0"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
  notas: z.string().trim().nullable().optional(),
});

const updateDeudaSchema = z.object({
  concepto: z.string().trim().min(1).max(255).optional(),
  monto_original: z.coerce.number().positive().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notas: z.string().trim().nullable().optional(),
});

const metodoPagoDeudaSchema = z.enum(["efectivo", "transferencia", "tarjeta"]);

const abonarDeudaSchema = z.object({
  monto: z.coerce.number().positive("El monto del abono debe ser mayor a 0"),
  metodo_pago: metodoPagoDeudaSchema.default("efectivo"),
  incluye_iva: z.coerce.boolean().default(false),
  iva_porcentaje: z.coerce.number().min(0, "El IVA no puede ser negativo").max(100, "El IVA no puede superar el 100%").default(21),
  notas: z.string().trim().nullable().optional(),
});

module.exports = {
  listDeudasSchema,
  createDeudaSchema,
  updateDeudaSchema,
  abonarDeudaSchema,
};
