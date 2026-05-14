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

const ownerAuthorizationRequestSchema = z.object({
  scope: z.string().min(1, "Falta el motivo de la autorizacion"),
  accion: z.string().min(1, "Falta la accion a autorizar").max(80),
  payload: z.record(z.string(), z.any()),
});

const rejectAuthorizationRequestSchema = z.object({
  reason: z.string().max(255).optional().nullable(),
});

const redeemAuthorizationRequestSchema = z.object({
  requestId: z.coerce.number().int().positive("Solicitud invalida"),
  code: z.string().trim().regex(/^\d{6}$/, "El codigo debe tener 6 digitos"),
});

module.exports = {
  loginSchema,
  ownerAuthorizationSchema,
  ownerAuthorizationRequestSchema,
  rejectAuthorizationRequestSchema,
  redeemAuthorizationRequestSchema,
};
