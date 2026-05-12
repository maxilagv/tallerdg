const { z } = require("zod");

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalido"),
  password: z.string().min(4, "La contrasena es muy corta"),
});

const ownerAuthorizationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalido"),
  password: z.string().min(4, "La contrasena es muy corta"),
  scope: z.string().min(1, "Falta el motivo de la autorizacion").optional(),
});

module.exports = { loginSchema, ownerAuthorizationSchema };
