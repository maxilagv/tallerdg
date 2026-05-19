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

const descuentoSchema = z.object({
  tipo: z.enum(["falta", "tardanza"]),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha invalida")
    .optional(),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a cero"),
  horas_jornada: z.coerce.number().positive("Las horas de jornada deben ser mayores a cero").nullable().optional(),
  motivo: z.string().trim().max(500).nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.tipo === "tardanza" && !data.horas_jornada) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["horas_jornada"],
      message: "Indica las horas de la jornada para calcular la tardanza.",
    });
  }
});

const anularDescuentoSchema = z.object({
  motivo: z.string().trim().min(3, "Describe brevemente el motivo de anulacion").max(500),
});

const anularAdelantoSchema = z.object({
  motivo: z.string().trim().min(3, "Describe brevemente el motivo de anulacion").max(500),
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
  descuentoSchema,
  anularAdelantoSchema,
  anularDescuentoSchema,
  historialSchema,
};
