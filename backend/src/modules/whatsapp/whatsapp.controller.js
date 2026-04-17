const WhatsAppService = require("./whatsapp.service");

const WhatsAppController = {
  async estado(req, res) {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });
    const data = await WhatsAppService.getEstado();
    return res.json({ ok: true, data });
  },

  async conectar(req, res) {
    const data = await WhatsAppService.inicializar();
    return res.json({ ok: true, data, message: "Inicialización de WhatsApp lanzada." });
  },

  async desconectar(req, res) {
    const data = await WhatsAppService.desconectar();
    return res.json({ ok: true, data, message: "WhatsApp desconectado." });
  },

  async reiniciar(req, res) {
    const data = await WhatsAppService.reiniciar();
    return res.json({ ok: true, data, message: "WhatsApp reiniciado." });
  },

  async log(req, res) {
    const data = await WhatsAppService.listarLog(req.query);
    return res.json({ ok: true, data });
  },

  async templates(req, res) {
    const data = await WhatsAppService.listarTemplates();
    return res.json({ ok: true, data });
  },

  async actualizarTemplate(req, res) {
    const data = await WhatsAppService.actualizarTemplate(req.params.id, req.body);
    return res.json({ ok: true, data, message: "Template actualizado." });
  },
};

module.exports = WhatsAppController;
