const ServiciosService = require("./servicios.service");

const ServiciosController = {
  async listar(req, res) {
    const data = await ServiciosService.listar(req.query);
    return res.json({ ok: true, data });
  },

  async obtener(req, res) {
    const data = await ServiciosService.obtener(req.params.id);
    return res.json({ ok: true, data });
  },

  async crear(req, res) {
    const data = await ServiciosService.crear(req.body);
    return res.status(201).json({ ok: true, data });
  },

  async actualizar(req, res) {
    const data = await ServiciosService.actualizar(req.params.id, req.body);
    return res.json({ ok: true, data });
  },

  async eliminar(req, res) {
    await ServiciosService.eliminar(req.params.id);
    return res.json({ ok: true, message: "Servicio eliminado." });
  },

  async precioMasivo(req, res) {
    await ServiciosService.aplicarAumentoMasivo(req.body);
    return res.json({ ok: true, message: "Precios actualizados." });
  },

  async importarExcel(req, res) {
    const data = await ServiciosService.importarExcel(req.file);
    return res.json({
      ok: true,
      data,
      message: `${data.creados} servicio(s) importados correctamente.`,
    });
  },
};

module.exports = ServiciosController;
