const FinanzasService = require("./finanzas.service");

const FinanzasController = {

  // ── Reportes ────────────────────────────────────────────────────────────────

  async resumen(req, res) {
    const data = await FinanzasService.resumen(req.query);
    return res.json({ ok: true, data });
  },

  async porDia(req, res) {
    const data = await FinanzasService.porDia(req.query);
    return res.json({ ok: true, data });
  },

  async gastosPorCategoria(req, res) {
    const data = await FinanzasService.gastosPorCategoria(req.query);
    return res.json({ ok: true, data });
  },

  async movimientos(req, res) {
    const data = await FinanzasService.movimientos(req.query);
    return res.json({ ok: true, data });
  },

  async movimientosMes(req, res) {
    const data = await FinanzasService.movimientosMes(req.query);
    return res.json({ ok: true, data });
  },

  // ── Análisis inteligente ─────────────────────────────────────────────────────

  async movimientosDetalle(req, res) {
    const data = await FinanzasService.movimientosDetalle(req.query);
    return res.json({ ok: true, data });
  },

  async analisis(req, res) {
    const data = await FinanzasService.analisis(req.query);
    return res.json({ ok: true, data });
  },

  async estadoResetCaja(req, res) {
    const data = await FinanzasService.estadoResetCaja();
    return res.json({ ok: true, data });
  },

  async resetCaja(req, res) {
    const data = await FinanzasService.resetCaja(req.body, req.user?.id);
    return res.status(201).json({ ok: true, data });
  },

  // ── CRUD Movimientos del Titular ─────────────────────────────────────────────

  async listarMovimientosTitular(req, res) {
    const data = await FinanzasService.listarMovimientosTitular(req.query);
    return res.json({ ok: true, data });
  },

  async crearMovimientoTitular(req, res) {
    const data = await FinanzasService.crearMovimientoTitular(req.body, req.user?.id);
    return res.status(201).json({ ok: true, data });
  },

  async actualizarMovimientoTitular(req, res) {
    const data = await FinanzasService.actualizarMovimientoTitular(Number(req.params.id), req.body);
    return res.json({ ok: true, data });
  },

  async eliminarMovimientoTitular(req, res) {
    await FinanzasService.eliminarMovimientoTitular(Number(req.params.id));
    return res.json({ ok: true, message: "Movimiento eliminado." });
  },

  // ── Export Excel ────────────────────────────────────────────────────────────

  async exportarExcel(req, res) {
    const { buffer, desde, hasta } = await FinanzasService.exportarExcel(req.query);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="caja_${desde}_${hasta}.xlsx"`);
    return res.send(buffer);
  },
};

module.exports = FinanzasController;
