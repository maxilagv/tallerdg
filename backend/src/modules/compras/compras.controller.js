const ComprasService = require("./compras.service");

const ComprasController = {
  async listar(req, res) {
    const data = await ComprasService.listar(req.query);
    return res.json({ ok: true, data });
  },

  async obtener(req, res) {
    const data = await ComprasService.obtener(req.params.id);
    return res.json({ ok: true, data });
  },

  async crear(req, res) {
    const data = await ComprasService.crear(req.body, req.user?.id);
    return res.status(201).json({ ok: true, data });
  },

  async eliminar(req, res) {
    await ComprasService.eliminar(req.params.id);
    return res.json({ ok: true, message: "Compra eliminada y stock restaurado." });
  },
};

module.exports = ComprasController;
