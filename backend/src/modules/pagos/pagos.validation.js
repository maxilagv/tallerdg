const { z } = require("zod");

const metodoPagoSchema = z.enum([
  "efectivo",
  "transferencia",
  "tarjeta_debito",
  "tarjeta_credito",
  "cheque",
]);

const createPagoSchema = z.object({
  orden_id: z.coerce.number().int().positive("La orden es obligatoria"),
  monto: z.coerce.number().gt(0, "El monto debe ser mayor a 0"),
  metodo: metodoPagoSchema,
  fecha: z.string().trim().min(1).optional(),
  referencia: z.string().trim().max(255).nullable().optional(),
  notas: z.string().trim().nullable().optional(),
});

const listPagosSchema = z.object({
  orden_id: z.coerce.number().int().positive().optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  metodo: metodoPagoSchema.optional(),
  empleado_id: z.coerce.number().int().positive().optional(),
  include_anulados: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(30),
});

const exportPagosSchema = listPagosSchema.extend({
  limit: z.coerce.number().int().min(1).max(5000).default(5000),
});

const cancelPagoSchema = z.object({
  motivo: z.string().trim().min(3, "Debes indicar el motivo de la anulacion").max(255),
});

module.exports = {
  metodoPagoSchema,
  createPagoSchema,
  listPagosSchema,
  exportPagosSchema,
  cancelPagoSchema,
};
