const { z } = require("zod");

function normalizarPatente(value) {
  return value.replace(/\s+/g, "").toUpperCase().trim();
}

const createVehiculoSchema = z.object({
  cliente_id: z.coerce.number().int().positive("El cliente es obligatorio"),
  patente: z
    .string()
    .trim()
    .min(6, "La patente es invalida")
    .max(10, "La patente es invalida")
    .transform(normalizarPatente),
  marca: z.string().trim().min(1, "La marca es obligatoria").max(60),
  modelo: z.string().trim().min(1, "El modelo es obligatorio").max(60),
  anio: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1).nullable().optional(),
  color: z.string().trim().max(40).nullable().optional(),
  tipo_combustible: z
    .enum(["nafta", "diesel", "gnc", "gnc_nafta", "hibrido", "electrico"])
    .default("nafta"),
  numero_motor: z.string().trim().max(50).nullable().optional(),
  numero_chasis: z.string().trim().max(50).nullable().optional(),
  km_ultimo_service: z.coerce.number().int().min(0).default(0),
  observaciones: z.string().trim().nullable().optional(),
});

const updateVehiculoSchema = createVehiculoSchema
  .omit({ cliente_id: true, patente: true })
  .partial();

const listVehiculosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
});

module.exports = {
  createVehiculoSchema,
  updateVehiculoSchema,
  listVehiculosSchema,
};
