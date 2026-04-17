const GastosService = require("./gastos.service");

const GastosController = {
  async listar(req, res) {
    const data = await GastosService.listar(req.query);
    return res.json({ ok: true, data });
  },

  async listarCategorias(req, res) {
    const data = await GastosService.listarCategorias();
    return res.json({ ok: true, data });
  },

  async crearCategoria(req, res) {
    const data = await GastosService.crearCategoria(req.body);
    return res.status(201).json({ ok: true, data });
  },

  async actualizarCategoria(req, res) {
    const data = await GastosService.actualizarCategoria(req.params.id, req.body);
    return res.json({ ok: true, data });
  },

  async eliminarCategoria(req, res) {
    await GastosService.eliminarCategoria(req.params.id);
    return res.json({ ok: true, message: "Categoría eliminada." });
  },

  async crear(req, res) {
    const data = await GastosService.crear(req.body, req.user?.id);
    return res.status(201).json({ ok: true, data });
  },

  async actualizar(req, res) {
    const data = await GastosService.actualizar(req.params.id, req.body);
    return res.json({ ok: true, data });
  },

  async eliminar(req, res) {
    await GastosService.eliminar(req.params.id);
    return res.json({ ok: true, message: "Gasto eliminado." });
  },
};

module.exports = GastosController;
