const ProductosService = require("./productos.service");

const ProductosController = {
  async listar(req, res) {
    const data = await ProductosService.listar(req.query);
    return res.json({ ok: true, data });
  },

  async obtener(req, res) {
    const data = await ProductosService.obtener(req.params.id);
    return res.json({ ok: true, data });
  },

  async crear(req, res) {
    const data = await ProductosService.crear(req.body);
    return res.status(201).json({ ok: true, data });
  },

  async actualizar(req, res) {
    const data = await ProductosService.actualizar(req.params.id, req.body);
    return res.json({ ok: true, data });
  },

  async eliminar(req, res) {
    await ProductosService.eliminar(req.params.id);
    return res.json({ ok: true, message: "Producto eliminado." });
  },

  async stockBajo(req, res) {
    const data = await ProductosService.stockBajo();
    return res.json({ ok: true, data });
  },

  async ajustarStock(req, res) {
    const data = await ProductosService.ajustarStock(req.params.id, req.body, req.user?.id);
    return res.json({ ok: true, data, message: "Stock actualizado." });
  },

  async importarExcel(req, res) {
    const data = await ProductosService.importarExcel(req.file);
    return res.json({
      ok: true,
      data,
      message: `${data.creados} producto(s) importados correctamente.`,
    });
  },
};

module.exports = ProductosController;
