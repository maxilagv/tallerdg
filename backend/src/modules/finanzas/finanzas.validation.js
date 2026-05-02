const { z } = require("zod");

// ── Filtros de período ────────────────────────────────────────────────────────

// Refinement compartido: la fecha desde no puede ser posterior a la fecha hasta.
const refineRango = (d) => d.desde <= d.hasta;
const refineRangoMsg = {
  message: "La fecha 'desde' no puede ser posterior a la fecha 'hasta'.",
  path: ["desde"],
};

const booleanQueryDefaultTrue = z.preprocess((value) => {
  if (value === undefined) return true;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "si", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

const rangoSchema = z
  .object({
    desde: z.string().min(1, "La fecha desde es obligatoria"),
    hasta: z.string().min(1, "La fecha hasta es obligatoria"),
  })
  .refine(refineRango, refineRangoMsg);

const resumenSchema = z
  .object({
    desde: z.string().min(1, "La fecha desde es obligatoria"),
    hasta: z.string().min(1, "La fecha hasta es obligatoria"),
    caja_inicia_en_cero: booleanQueryDefaultTrue,
  })
  .refine(refineRango, refineRangoMsg);

const porDiaSchema = z
  .object({
    desde: z.string().min(1, "La fecha desde es obligatoria"),
    hasta: z.string().min(1, "La fecha hasta es obligatoria"),
  })
  .refine(refineRango, refineRangoMsg);

const movimientosMesSchema = z.object({
  mes:  z.coerce.number().int().min(1).max(12),
  anio: z.coerce.number().int().min(2000).max(2100),
});

const movimientosSchema = z
  .object({
    desde: z.string().min(1, "La fecha desde es obligatoria"),
    hasta: z.string().min(1, "La fecha hasta es obligatoria"),
    page:  z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .refine(refineRango, refineRangoMsg);

// ── Movimientos del Titular ────────────────────────────────────────────────────

const tiposMovimientoTitular = ["aporte_titular", "retiro_titular"];

/**
 * Schema para crear o actualizar un movimiento del titular.
 * Todos los campos editables con sus validaciones.
 */
const movimientoTitularCreateSchema = z.object({
  tipo: z.enum(tiposMovimientoTitular, {
    errorMap: () => ({ message: 'El tipo debe ser "aporte_titular" o "retiro_titular".' }),
  }),
  monto: z
    .number({ invalid_type_error: "El monto debe ser un número." })
    .positive("El monto debe ser mayor que cero.")
    .max(999_999_999, "El monto es demasiado alto."),
  concepto: z
    .string()
    .min(3, "El concepto debe tener al menos 3 caracteres.")
    .max(255, "El concepto no puede superar los 255 caracteres."),
  referencia: z.string().max(255).optional().nullable(),
  fecha: z.string().min(1, "La fecha es obligatoria."),
  notas: z.string().max(2000).optional().nullable(),
});

const movimientoTitularUpdateSchema = movimientoTitularCreateSchema.partial();

/** Filtros para listar movimientos del titular */
const movimientosTitularListSchema = z.object({
  desde: z.string().optional(),
  hasta: z.string().optional(),
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const resetCajaSchema = z.object({
  fecha: z.string().min(1, "La fecha del reset es obligatoria."),
});

module.exports = {
  resumenSchema,
  rangoSchema,
  porDiaSchema,
  movimientosSchema,
  movimientosMesSchema,
  movimientoTitularCreateSchema,
  movimientoTitularUpdateSchema,
  movimientosTitularListSchema,
  resetCajaSchema,
};
