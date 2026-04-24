const { z } = require("zod");

const origenTipoSchema = z.enum(["directa", "proveedor", "casa_repuestos"]);

const compraItemSchema = z
  .object({
    producto_id: z.number().int().positive().nullable().optional(),
    descripcion: z.string().trim().max(255).nullable().optional(),
    cantidad: z.number().positive("La cantidad debe ser mayor a cero"),
    precio_unitario: z.number().min(0, "El precio no puede ser negativo"),
  })
  .superRefine((data, ctx) => {
    if (!data.producto_id && !data.descripcion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El item necesita un producto o una descripcion.",
        path: ["descripcion"],
      });
    }
  });

const createCompraSchema = z
  .object({
    proveedor_id: z.number().int().positive().nullable().optional(),
    origen_tipo: origenTipoSchema.default("directa").optional(),
    origen_nombre: z.string().trim().max(150).nullable().optional(),
    actualiza_stock: z.boolean().default(true).optional(),
    fecha: z.string().min(1, "La fecha es obligatoria"),
    notas: z.string().trim().nullable().optional(),
    items: z.array(compraItemSchema).min(1, "Agrega al menos un item a la compra"),
  })
  .superRefine((data, ctx) => {
    if (data.origen_tipo === "proveedor" && !data.proveedor_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona un proveedor o cambia el tipo de compra.",
        path: ["proveedor_id"],
      });
    }

    if (data.origen_tipo === "casa_repuestos" && !data.origen_nombre) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa el nombre de la casa de repuestos.",
        path: ["origen_nombre"],
      });
    }

    if (data.actualiza_stock && data.items.some((item) => !item.producto_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Para sumar stock, todos los items deben estar vinculados a un producto.",
        path: ["items"],
      });
    }
  });

const listComprasSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  proveedor_id: z.coerce.number().int().positive().optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
});

module.exports = { createCompraSchema, listComprasSchema };
