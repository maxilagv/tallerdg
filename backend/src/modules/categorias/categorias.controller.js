const CategoriasService = require("./categorias.service");

const CategoriasController = {
  async listar(req, res) {
    const data = await CategoriasService.listar(req.query);
    return res.json({ ok: true, data });
  },

  async crear(req, res) {
    const data = await CategoriasService.crear(req.body);
    return res.status(201).json({ ok: true, data });
  },

  async actualizar(req, res) {
    const data = await CategoriasService.actualizar(req.params.id, req.body);
    return res.json({ ok: true, data });
  },

  async eliminar(req, res) {
    await CategoriasService.eliminar(req.params.id);
    return res.json({ ok: true, message: "Categoría eliminada." });
  },
};

module.exports = CategoriasController;
