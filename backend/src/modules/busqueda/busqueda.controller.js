const BusquedaService = require("./busqueda.service");

const BusquedaController = {
  async buscar(req, res) {
    const data = await BusquedaService.buscar(req.query.q, req.user);
    return res.json({ ok: true, data });
  },
};

module.exports = BusquedaController;
