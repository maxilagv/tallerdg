const { z } = require("zod");

const permisoValorSchema = z.enum(["r", "rw", "none"]);

const createEmpleadoSchema = z.object({
  rol_id: z.coerce.number().int().positive("El rol es obligatorio"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  apellido: z.string().trim().min(1, "El apellido es obligatorio").max(100),
  telefono: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().email("Email invalido").max(150),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

const updateEmpleadoSchema = z.object({
  rol_id: z.coerce.number().int().positive().optional(),
  nombre: z.string().trim().min(1).max(100).optional(),
  apellido: z.string().trim().min(1).max(100).optional(),
  telefono: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().email("Email invalido").max(150).optional(),
  activo: z.coerce.boolean().optional(),
});

const listEmpleadosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
});

const changePasswordSchema = z.object({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

const rolePermissionsSchema = z.object({
  nombre: z.string().trim().min(1).max(50).optional(),
  permisos: z.record(z.string(), permisoValorSchema),
});

module.exports = {
  createEmpleadoSchema,
  updateEmpleadoSchema,
  listEmpleadosSchema,
  changePasswordSchema,
  rolePermissionsSchema,
};
