const VehiculosService = require("./vehiculos.service");

const VehiculosController = {
  async listar(req, res) {
    const data = await VehiculosService.listar(req.query);
    return res.json({ ok: true, data });
  },

  async obtener(req, res) {
    const data = await VehiculosService.obtener(req.params.id);
    return res.json({ ok: true, data });
  },

  async historial(req, res) {
    const data = await VehiculosService.historial(req.params.id);
    return res.json({ ok: true, data });
  },

  async crear(req, res) {
    const data = await VehiculosService.crear(req.body);
    return res.status(201).json({ ok: true, data });
  },

  async actualizar(req, res) {
    const data = await VehiculosService.actualizar(req.params.id, req.body);
    return res.json({ ok: true, data });
  },

  async eliminar(req, res) {
    await VehiculosService.eliminar(req.params.id);
    return res.json({ ok: true, message: "Vehiculo eliminado." });
  },

  async buscarPorPatente(req, res) {
    const data = await VehiculosService.buscarPorPatente(req.params.patente);
    return res.json({ ok: true, data });
  },
};

module.exports = VehiculosController;
