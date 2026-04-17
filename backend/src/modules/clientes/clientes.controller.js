const ClientesService = require("./clientes.service");

const ClientesController = {
  async listar(req, res) {
    const data = await ClientesService.listar(req.query);
    return res.json({ ok: true, data });
  },

  async obtener(req, res) {
    const data = await ClientesService.obtener(req.params.id);
    return res.json({ ok: true, data });
  },

  async deuda(req, res) {
    const data = await ClientesService.deuda(req.params.id);
    return res.json({ ok: true, data });
  },

  async crear(req, res) {
    const data = await ClientesService.crear(req.body);
    return res.status(201).json({ ok: true, data });
  },

  async actualizar(req, res) {
    const data = await ClientesService.actualizar(req.params.id, req.body);
    return res.json({ ok: true, data });
  },

  async eliminar(req, res) {
    await ClientesService.eliminar(req.params.id);
    return res.json({ ok: true, message: "Cliente eliminado." });
  },

  async registroExpress(req, res) {
    const data = await ClientesService.registroExpress(req.body);
    return res.status(201).json({ ok: true, data });
  },
};

module.exports = ClientesController;
