const { z } = require("zod");
const db = require("../../shared/db/knex");
const logger = require("../../shared/logger");
const whatsappClient = require("../../shared/whatsapp/whatsapp.client");
const AppError = require("../../shared/errors/AppError");

const listLogSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  tipo: z.string().trim().optional(),
  estado: z.string().trim().optional(),
});

const updateTemplateSchema = z.object({
  texto: z.string().trim().min(1, "El texto es obligatorio"),
  activo: z.coerce.boolean().optional(),
});

async function getConfig(keys) {
  const rows = await db("configuracion").whereIn("clave", keys);
  return Object.fromEntries(rows.map((row) => [row.clave, row.valor]));
}

async function renderTemplate(tipo, variables) {
  const template = await db("wsp_templates").where({ tipo }).where("activo", 1).first();

  if (!template) {
    throw new AppError(`Template "${tipo}" no encontrado.`, 404, "NOT_FOUND");
  }

  let texto = template.texto;
  Object.entries(variables).forEach(([key, value]) => {
    texto = texto.replaceAll(`{${key}}`, String(value ?? ""));
  });

  return texto;
}

const WhatsAppService = {
  async inicializar() {
    const config = await getConfig(["wsp_activo"]);
    if (config.wsp_activo === "0") {
      return { estado: "desactivado", qrCode: null };
    }

    return whatsappClient.inicializar();
  },

  async desconectar() {
    return whatsappClient.desconectar();
  },

  async reiniciar() {
    return whatsappClient.reiniciar();
  },

  async getEstado() {
    const config = await getConfig(["wsp_activo"]);
    if (config.wsp_activo === "0") {
      return { estado: "desactivado", qrCode: null };
    }

    return whatsappClient.getEstado();
  },

  async enviarConLog(telefono, tipo, variables, options = {}) {
    const config = await getConfig(["wsp_activo"]);

    if (config.wsp_activo === "0") {
      return { skipped: true };
    }

    const contenido = await renderTemplate(tipo, variables);

    const [logId] = await db("wsp_mensajes_log").insert({
      destinatario: telefono,
      tipo,
      contenido,
      estado: "pendiente",
    });

    try {
      await whatsappClient.enviarMensaje(telefono, contenido);

      await db("wsp_mensajes_log").where({ id: logId }).update({
        estado: "enviado",
        enviado_at: db.fn.now(),
      });

      logger.info({ tipo, destinatario: telefono }, "WhatsApp enviado");
    } catch (error) {
      await db("wsp_mensajes_log").where({ id: logId }).update({
        estado: "fallido",
        error_detalle: error.message,
      });

      logger.warn({ tipo, destinatario: telefono, error: error.message }, "WhatsApp falló");

      if (options.throwOnError) {
        throw new AppError(
          "No se pudo enviar el WhatsApp. Revisa que la sesion este conectada.",
          503,
          "WHATSAPP_SEND_FAILED"
        );
      }
    }

    return { ok: true };
  },

  async notificarOrdenCerrada(ordenId) {
    const config = await getConfig(["wsp_activo", "wsp_notificar_orden_cerrada", "taller_nombre"]);

    if (config.wsp_activo === "0" || config.wsp_notificar_orden_cerrada === "0") {
      return { skipped: true };
    }

    const orden = await db("ordenes as o")
      .join("clientes as c", "o.cliente_id", "c.id")
      .join("vehiculos as v", "o.vehiculo_id", "v.id")
      .where("o.id", ordenId)
      .select("o.*", "c.nombre", "c.apellido", "c.telefono", "v.patente", "v.marca", "v.modelo")
      .first();

    if (!orden?.telefono) {
      return { skipped: true };
    }

    const servicios = await db("orden_servicios")
      .where({ orden_id: ordenId })
      .pluck("descripcion");

    return this.enviarConLog(orden.telefono, "orden_cerrada", {
      nombre: orden.nombre,
      patente: orden.patente,
      servicios: servicios.join(", ") || "Varios trabajos",
      total: `$${Number(orden.total).toLocaleString("es-AR")}`,
      taller: config.taller_nombre || "el taller",
    });
  },

  async listarLog(query) {
    const parsed = listLogSchema.safeParse(query);

    if (!parsed.success) {
      throw new AppError("Parámetros inválidos.", 400, "VALIDATION_ERROR");
    }

    const { page, limit, tipo, estado } = parsed.data;
    const offset = (page - 1) * limit;

    const baseQuery = db("wsp_mensajes_log");

    if (tipo) {
      baseQuery.where({ tipo });
    }

    if (estado) {
      baseQuery.where({ estado });
    }

    const [rows, [{ total }]] = await Promise.all([
      baseQuery.clone().orderBy("created_at", "desc").limit(limit).offset(offset),
      baseQuery.clone().count("id as total"),
    ]);

    return {
      rows,
      total: Number(total),
      page,
      limit,
    };
  },

  async listarTemplates() {
    return db("wsp_templates").orderBy("tipo", "asc");
  },

  async actualizarTemplate(id, data) {
    const templateId = Number(id);
    if (!Number.isInteger(templateId) || templateId <= 0) {
      throw new AppError("Identificador inválido.", 400, "VALIDATION_ERROR");
    }

    const parsed = updateTemplateSchema.safeParse(data);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos inválidos.", 400, "VALIDATION_ERROR");
    }

    const existing = await db("wsp_templates").where({ id: templateId }).first();
    if (!existing) {
      throw new AppError("Template no encontrado.", 404, "NOT_FOUND");
    }

    await db("wsp_templates").where({ id: templateId }).update({
      texto: parsed.data.texto,
      ...(parsed.data.activo !== undefined && { activo: parsed.data.activo ? 1 : 0 }),
      updated_at: db.fn.now(),
    });

    return db("wsp_templates").where({ id: templateId }).first();
  },
};

module.exports = WhatsAppService;
