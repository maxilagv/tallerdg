const { z } = require("zod");

function normalizarPatente(value) {
  return value.replace(/\s+/g, "").toUpperCase().trim();
}

// Preprocesador para campos numéricos opcionales que pueden llegar como "" desde el form
function preprocesarNumero(v) {
  return v === "" || v == null ? undefined : v;
}

const createClienteSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  apellido: z.string().trim().min(1, "El apellido es obligatorio").max(100),
  telefono: z.string().trim().max(30).nullable().optional(),
  email: z
    .union([z.string().trim().email("Email invalido").max(150), z.literal(""), z.null()])
    .optional(),
  direccion: z.string().trim().max(255).nullable().optional(),
  notas: z.string().trim().nullable().optional(),
});

const updateClienteSchema = createClienteSchema.partial();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
});

const registroExpressSchema = z.object({
  // Datos del cliente
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  apellido: z.string().trim().min(1, "El apellido es obligatorio").max(100),
  telefono: z.string().trim().max(30).nullable().optional(),
  email: z
    .union([z.string().trim().email("Email invalido").max(150), z.literal(""), z.null()])
    .optional(),

  // Datos del vehículo
  patente: z
    .string()
    .trim()
    .min(6, "La patente debe tener al menos 6 caracteres")
    .max(10, "La patente es invalida")
    .transform(normalizarPatente),
  marca: z.string().trim().min(1, "La marca es obligatoria").max(60),
  modelo: z.string().trim().min(1, "El modelo es obligatorio").max(60),
  anio: z.preprocess(
    preprocesarNumero,
    z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1)
  ).nullable().optional(),
  color: z.string().trim().max(40).nullable().optional(),
  tipo_combustible: z
    .enum(["nafta", "diesel", "gnc", "gnc_nafta", "hibrido", "electrico"])
    .default("nafta"),
  km_actual: z.preprocess(
    preprocesarNumero,
    z.coerce.number().int().min(0)
  ).optional().default(0),
});

module.exports = {
  createClienteSchema,
  updateClienteSchema,
  paginationSchema,
  registroExpressSchema,
};
