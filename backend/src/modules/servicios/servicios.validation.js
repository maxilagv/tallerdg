const { z } = require("zod");

const createServicioSchema = z.object({
  categoria_id: z.coerce.number().int().positive("La categoria es obligatoria"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  descripcion: z.string().trim().nullable().optional(),
  precio_base: z.coerce.number().min(0, "El precio no puede ser negativo"),
  tiempo_estimado_min: z.coerce.number().int().min(0).default(0),
});

const updateServicioSchema = createServicioSchema.partial();

const listServiciosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  categoria_id: z.coerce.number().int().positive().optional(),
  q: z.string().trim().optional(),
});

const precioMasivoSchema = z.object({
  porcentaje: z.coerce.number().gt(0, "El porcentaje debe ser mayor a 0"),
  categoria_id: z.coerce.number().int().positive().nullable().optional(),
});

module.exports = {
  createServicioSchema,
  updateServicioSchema,
  listServiciosSchema,
  precioMasivoSchema,
};
