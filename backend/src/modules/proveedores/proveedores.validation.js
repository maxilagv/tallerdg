const { z } = require("zod");

// ── CRUD ────────────────────────────────────────────────────────────────────

const createProveedorSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  cuit: z.string().trim().max(20).nullable().optional(),
  telefono: z.string().trim().max(30).nullable().optional(),
  email: z
    .union([z.string().trim().email("Email invalido"), z.literal(""), z.null()])
    .optional(),
  condicion_pago: z.string().trim().max(100).nullable().optional(),
  notas: z.string().trim().nullable().optional(),
});

const updateProveedorSchema = createProveedorSchema.partial();

const listProveedoresSchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

// ── CUENTA CORRIENTE ─────────────────────────────────────────────────────────

// Al activar se puede opcionalmente cargar un saldo inicial
// (ej: "ya les debíamos $5000 de antes de usar el sistema")
const activarCCSchema = z.object({
  saldo_inicial: z.coerce.number().default(0),
});

const pagoProveedorSchema = z.object({
  monto: z.coerce.number().positive("El monto debe ser mayor a cero"),
  fecha: z.string().trim().min(1).optional(),
  descripcion: z
    .string()
    .trim()
    .min(1, "La descripcion es obligatoria")
    .max(500),
});

const listMovimientosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  desde: z.string().optional(),
  hasta: z.string().optional(),
});

module.exports = {
  createProveedorSchema,
  updateProveedorSchema,
  listProveedoresSchema,
  activarCCSchema,
  pagoProveedorSchema,
  listMovimientosSchema,
};
