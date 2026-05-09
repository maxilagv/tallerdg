const OrdenesService = require("./ordenes.service");
const RemitosService = require("../remitos/remitos.service");

const OrdenesController = {
  async listar(req, res) {
    const data = await OrdenesService.listar(req.query);
    return res.json({ ok: true, data });
  },

  async obtener(req, res) {
    const data = await OrdenesService.obtener(req.params.id);
    return res.json({ ok: true, data });
  },

  async saldo(req, res) {
    const data = await OrdenesService.obtenerSaldo(req.params.id);
    return res.json({ ok: true, data });
  },

  async crear(req, res) {
    const data = await OrdenesService.crear(req.body, req.user?.id);
    return res.status(201).json({ ok: true, data });
  },

  async actualizar(req, res) {
    const data = await OrdenesService.actualizar(req.params.id, req.body);
    return res.json({ ok: true, data });
  },

  async agregarServicio(req, res) {
    const { orden, servicio_creado } = await OrdenesService.agregarServicio(req.params.id, req.body);
    return res.json({ ok: true, data: orden, servicio_creado });
  },

  async quitarServicio(req, res) {
    const data = await OrdenesService.quitarServicio(req.params.id, req.params.itemId);
    return res.json({ ok: true, data });
  },

  async agregarProducto(req, res) {
    const data = await OrdenesService.agregarProducto(req.params.id, req.body, req.user?.id);
    return res.json({ ok: true, data });
  },

  async agregarProductosBatch(req, res) {
    const data = await OrdenesService.agregarProductosBatch(req.params.id, req.body, req.user?.id);
    return res.json({ ok: true, data });
  },

  async quitarProducto(req, res) {
    const data = await OrdenesService.quitarProducto(req.params.id, req.params.itemId, req.user?.id);
    return res.json({ ok: true, data });
  },

  async cambiarEstado(req, res) {
    const data = await OrdenesService.cambiarEstado(req.params.id, req.body);
    return res.json({ ok: true, data });
  },

  async actualizarNotas(req, res) {
    const data = await OrdenesService.actualizarNotas(req.params.id, req.body);
    return res.json({ ok: true, data });
  },

  async aplicarDescuento(req, res) {
    const data = await OrdenesService.aplicarDescuento(req.params.id, req.body);
    return res.json({ ok: true, data });
  },

  async aplicarIva(req, res) {
    const data = await OrdenesService.aplicarIva(req.params.id, req.body);
    return res.json({ ok: true, data });
  },

  async actualizarRecordatorioService(req, res) {
    const data = await OrdenesService.actualizarRecordatorioService(req.params.id, req.body);
    return res.json({ ok: true, data });
  },

  async eliminarRecordatorioService(req, res) {
    const data = await OrdenesService.eliminarRecordatorioService(req.params.id);
    return res.json({ ok: true, data });
  },

  async eliminar(req, res) {
    await OrdenesService.eliminarCancelada(req.params.id, req.user?.id);
    return res.json({ ok: true, message: "Orden eliminada correctamente." });
  },

  async imprimirOrdenTrabajo(req, res) {
    const { numero, pdfBuffer } = await RemitosService.generarOrdenTrabajo(Number(req.params.id));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="orden-trabajo-${numero}.pdf"`);
    return res.send(pdfBuffer);
  },

  async descargarRemito(req, res) {
    const { numero, pdfBuffer } = await RemitosService.generarParaOrden(Number(req.params.id));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="remito-${numero}.pdf"`);
    return res.send(pdfBuffer);
  },
};

module.exports = OrdenesController;
