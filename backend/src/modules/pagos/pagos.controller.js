const PagosService = require("./pagos.service");

const PagosController = {
  async listar(req, res) {
    const data = await PagosService.listar(req.query);
    return res.json({ ok: true, data });
  },

  async crear(req, res) {
    const data = await PagosService.crear(req.body, req.user?.id);
    return res.status(201).json({ ok: true, data });
  },

  async anular(req, res) {
    const data = await PagosService.anular(req.params.id, req.body, req.user?.id);
    return res.json({ ok: true, data, message: "Cobro anulado." });
  },

  async exportarExcel(req, res) {
    const { buffer, filename } = await PagosService.exportarExcel(req.query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  },
};

module.exports = PagosController;
