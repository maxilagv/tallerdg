const { z } = require("zod");

const metodoPagoSchema = z.enum([
  "efectivo",
  "transferencia",
  "tarjeta_debito",
  "tarjeta_credito",
  "cheque",
]);

const upsertConfigSchema = z.object({
  sueldo_base: z.coerce.number().min(0, "El sueldo debe ser mayor o igual a cero"),
  periodo_pago: z.enum(["semana", "quincena", "mes"]),
});

const abrirPeriodoSchema = z.object({
  fecha_inicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha invalida"),
});

const actualizarPeriodoSchema = z.object({
  fecha_inicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha invalida")
    .optional(),
  fecha_fin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha invalida")
    .optional(),
  sueldo_base: z.coerce.number().min(0, "El sueldo debe ser mayor o igual a cero").optional(),
});

const adelantoSchema = z.object({
  monto: z.coerce.number().positive("El monto debe ser mayor a cero"),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha invalida")
    .optional(),
  descripcion: z.string().trim().max(300).nullable().optional(),
  metodo_pago: metodoPagoSchema,
});

const historialSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

module.exports = {
  upsertConfigSchema,
  abrirPeriodoSchema,
  actualizarPeriodoSchema,
  adelantoSchema,
  historialSchema,
};
