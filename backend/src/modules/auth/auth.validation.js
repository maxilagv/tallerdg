const { z } = require("zod");

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalido"),
  password: z.string().min(4, "La contrasena es muy corta"),
});

module.exports = { loginSchema };
