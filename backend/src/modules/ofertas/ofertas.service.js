const { z } = require("zod");
const db = require("../../shared/db/knex");
const logger = require("../../shared/logger");
const AppError = require("../../shared/errors/AppError");
const { uploadBuffer, deleteImage } = require("../../shared/cloudinary");
const whatsappClient = require("../../shared/whatsapp/whatsapp.client");
const OfertasRepository = require("./ofertas.repository");

const crearSchema = z.object({
  titulo: z.string().trim().min(1, "El título es obligatorio"),
  mensaje: z.string().trim().min(1, "El mensaje es obligatorio"),
  programada_para: z.string().trim().optional().nullable(),
});

const OfertasService = {
  async listar(query = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    return OfertasRepository.listar({ page, limit });
  },

  async crear(body, file, empleadoId) {
    const parsed = crearSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos inválidos.", 400, "VALIDATION_ERROR");
    }

    let imagen_url = null;
    let imagen_public_id = null;

    if (file) {
      const result = await uploadBuffer(file.buffer, { folder: "tallerpro/ofertas" });
      imagen_url = result.secure_url;
      imagen_public_id = result.public_id;
    }

    return OfertasRepository.crear({
      titulo: parsed.data.titulo,
      mensaje: parsed.data.mensaje,
      imagen_url,
      imagen_public_id,
      programada_para: parsed.data.programada_para || null,
      creado_por: empleadoId || null,
    });
  },

  async eliminar(id) {
    const ofertaId = Number(id);
    if (!Number.isInteger(ofertaId) || ofertaId <= 0) {
      throw new AppError("Identificador inválido.", 400, "VALIDATION_ERROR");
    }

    const oferta = await OfertasRepository.findById(ofertaId);
    if (!oferta) {
      throw new AppError("Oferta no encontrada.", 404, "NOT_FOUND");
    }

    if (oferta.imagen_public_id) {
      deleteImage(oferta.imagen_public_id).catch((error) => {
        logger.warn({ error: error.message }, "No se pudo eliminar imagen de Cloudinary");
      });
    }

    await OfertasRepository.eliminar(ofertaId);
    return { ok: true };
  },

  async enviar(id) {
    const ofertaId = Number(id);
    if (!Number.isInteger(ofertaId) || ofertaId <= 0) {
      throw new AppError("Identificador inválido.", 400, "VALIDATION_ERROR");
    }

    const oferta = await OfertasRepository.findById(ofertaId);
    if (!oferta) {
      throw new AppError("Oferta no encontrada.", 404, "NOT_FOUND");
    }

    const { estado } = whatsappClient.getEstado();
    if (estado !== "conectado") {
      throw new AppError("WhatsApp no está conectado. Conectate antes de enviar.", 400, "WHATSAPP_DISCONNECTED");
    }

    const clientes = await db("clientes")
      .whereNotNull("telefono")
      .where("telefono", "!=", "")
      .where("activo", 1)
      .select("id", "nombre", "telefono");

    let enviados = 0;
    for (const cliente of clientes) {
      try {
        await whatsappClient.enviarMensaje(cliente.telefono, oferta.mensaje);
        enviados++;
      } catch (error) {
        logger.warn({ error: error.message, clienteId: cliente.id }, "No se pudo enviar oferta al cliente");
      }
    }

    await OfertasRepository.actualizar(ofertaId, {
      enviada_at: db.fn.now(),
      total_enviados: enviados,
    });

    logger.info({ ofertaId, enviados, total: clientes.length }, "Oferta enviada masivamente");
    return { enviados, total: clientes.length };
  },
};

module.exports = OfertasService;
