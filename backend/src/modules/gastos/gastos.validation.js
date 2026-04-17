const { z } = require("zod");

const metodoPagoSchema = z.enum([
  "efectivo",
  "transferencia",
  "tarjeta_debito",
  "tarjeta_credito",
  "cheque",
]);

const listGastosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  categoria_id: z.coerce.number().int().positive().optional(),
});

const createGastoSchema = z.object({
  categoria_id: z.coerce.number().int().positive("La categoria es obligatoria"),
  descripcion: z.string().trim().min(1, "La descripcion es obligatoria").max(255),
  monto: z.coerce.number().gt(0, "El monto debe ser mayor a 0"),
  metodo_pago: metodoPagoSchema,
  fecha: z.string().min(1, "La fecha es obligatoria"),
  referencia_empleado_id: z.coerce.number().int().positive().nullable().optional(),
  adjunto_url: z.string().trim().nullable().optional(),
  notas: z.string().trim().nullable().optional(),
});

const updateGastoSchema = createGastoSchema.partial();

module.exports = {
  listGastosSchema,
  createGastoSchema,
  updateGastoSchema,
};
