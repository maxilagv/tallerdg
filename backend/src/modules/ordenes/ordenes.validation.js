const { z } = require("zod");

const listOrdenesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.enum(["abierta", "en_proceso", "lista", "cerrada", "cancelada"]).optional(),
  cliente_id: z.coerce.number().int().positive().optional(),
  q: z.string().trim().optional(),
});

const createOrdenSchema = z.object({
  cliente_id: z.coerce.number().int().positive("El cliente es obligatorio"),
  vehiculo_id: z.coerce.number().int().positive("El vehiculo es obligatorio"),
  empleado_id: z.coerce.number().int().positive().nullable().optional(),
  km_entrada: z.coerce.number().int().min(0).default(0),
  notas_cliente: z.string().trim().nullable().optional(),
  adelanto: z.coerce.number().min(0).default(0).optional(),
  adelanto_metodo: z
    .enum(["efectivo", "transferencia", "tarjeta_debito", "tarjeta_credito", "cheque"])
    .nullable()
    .optional(),
});

const ordenServicioSchema = z
  .object({
    servicio_id: z.coerce.number().int().positive().optional().nullable(),
    nombre_nuevo: z.string().trim().min(1).max(120).optional(),
    descripcion: z.string().trim().nullable().optional(),
    cantidad: z.coerce.number().int().min(1).default(1),
    precio_unitario: z.coerce.number().min(0).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const tieneId = data.servicio_id != null && data.servicio_id > 0;
    const tieneNombre = Boolean(data.nombre_nuevo);

    if (!tieneId && !tieneNombre) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debes seleccionar un servicio o ingresar un nombre.",
        path: ["servicio_id"],
      });
    }

    if (tieneNombre && !tieneId && (data.precio_unitario == null || data.precio_unitario < 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El precio es obligatorio para servicios personalizados.",
        path: ["precio_unitario"],
      });
    }
  });

const ordenProductoSchema = z.object({
  producto_id: z.coerce.number().int().positive("El producto es obligatorio"),
  descripcion: z.string().trim().nullable().optional(),
  cantidad: z.coerce.number().gt(0, "La cantidad debe ser mayor a 0"),
  precio_unitario: z.coerce.number().min(0).nullable().optional(),
});

const estadoOrdenSchema = z.object({
  estado: z.enum(["abierta", "en_proceso", "lista", "cerrada", "cancelada"]),
});

const notasOrdenSchema = z
  .object({
    notas_cliente: z.string().trim().nullable().optional(),
    notas_mecanico: z.string().trim().nullable().optional(),
    km_entrada: z.coerce.number().int().min(0).optional(),
  })
  .refine(
    (data) =>
      data.notas_cliente !== undefined ||
      data.notas_mecanico !== undefined ||
      data.km_entrada !== undefined,
    {
      message: "Debes enviar al menos un campo para actualizar.",
    }
  );

const descuentoOrdenSchema = z.object({
  descuento: z.coerce.number().min(0, "El descuento no puede ser negativo"),
});

const recordatorioServiceSchema = z.object({
  servicio: z.string().trim().min(1, "El servicio es obligatorio").max(120),
  km_base: z.coerce.number().int().min(0, "El kilometraje base no puede ser negativo"),
  km_proximo: z.coerce.number().int().min(1, "El kilometraje objetivo es obligatorio"),
  km_por_dia: z.coerce.number().positive("Los kilometros por dia deben ser mayores a 0"),
});

const batchProductosSchema = z.object({
  items: z
    .array(
      z
        .object({
          producto_id: z.coerce.number().int().positive().optional().nullable(),
          nombre_nuevo: z.string().trim().min(1).max(150).optional(),
          descripcion: z.string().trim().nullable().optional(),
          cantidad: z.coerce.number().gt(0, "La cantidad debe ser mayor a 0"),
          precio_unitario: z.coerce.number().min(0).nullable().optional(),
        })
        .superRefine((data, ctx) => {
          const tieneId = data.producto_id != null && data.producto_id > 0;
          const tieneNombre = Boolean(data.nombre_nuevo);

          if (!tieneId && !tieneNombre) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Cada ítem necesita un producto seleccionado o un nombre.",
              path: ["producto_id"],
            });
          }

          if (tieneNombre && !tieneId && (data.precio_unitario == null || data.precio_unitario < 0)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "El precio es obligatorio para productos personalizados.",
              path: ["precio_unitario"],
            });
          }
        })
    )
    .min(1, "Debes agregar al menos un producto"),
});

module.exports = {
  listOrdenesSchema,
  createOrdenSchema,
  ordenServicioSchema,
  ordenProductoSchema,
  batchProductosSchema,
  estadoOrdenSchema,
  notasOrdenSchema,
  descuentoOrdenSchema,
  recordatorioServiceSchema,
};
