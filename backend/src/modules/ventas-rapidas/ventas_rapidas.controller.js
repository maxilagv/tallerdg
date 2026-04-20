const VentasRapidasService = require("./ventas_rapidas.service");

const VentasRapidasController = {
  async listar(req, res) {
    const data = await VentasRapidasService.listar(req.query);
    return res.json({ ok: true, data });
  },

  async obtener(req, res) {
    const data = await VentasRapidasService.obtener(req.params.id);
    return res.json({ ok: true, data });
  },

  async saldoCajaHoy(req, res) {
    const data = await VentasRapidasService.saldoCajaHoy();
    return res.json({ ok: true, data });
  },

  async crear(req, res) {
    const data = await VentasRapidasService.crear(req.body, req.empleado?.id);
    return res.status(201).json({ ok: true, data });
  },
};

module.exports = VentasRapidasController;
