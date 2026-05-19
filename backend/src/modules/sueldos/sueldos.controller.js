const SueldosService = require("./sueldos.service");

const SueldosController = {
  async getResumen(req, res) {
    const data = await SueldosService.getResumen();
    return res.json({ ok: true, data });
  },

  async getConfig(req, res) {
    const data = await SueldosService.getConfig(req.params.empleadoId);
    return res.json({ ok: true, data: data || null });
  },

  async upsertConfig(req, res) {
    const data = await SueldosService.upsertConfig(req.params.empleadoId, req.body);
    return res.json({ ok: true, data });
  },

  async abrirPeriodo(req, res) {
    const data = await SueldosService.abrirPeriodo(req.params.empleadoId, req.body);
    return res.status(201).json({ ok: true, data });
  },

  async actualizarPeriodo(req, res) {
    const data = await SueldosService.actualizarPeriodo(req.params.periodoId, req.body);
    return res.json({ ok: true, data });
  },

  async liquidar(req, res) {
    const data = await SueldosService.liquidar(req.params.periodoId, req.body, req.user?.id);
    return res.json({ ok: true, data });
  },

  async registrarAdelanto(req, res) {
    const data = await SueldosService.registrarAdelanto(
      req.params.periodoId,
      req.body,
      req.user?.id
    );
    return res.status(201).json({ ok: true, data });
  },

  async registrarDescuento(req, res) {
    const data = await SueldosService.registrarDescuento(
      req.params.periodoId,
      req.body,
      req.user?.id
    );
    return res.status(201).json({ ok: true, data });
  },

  async anularAdelanto(req, res) {
    const data = await SueldosService.anularAdelanto(req.params.adelantoId, req.body, req.user?.id);
    return res.json({ ok: true, data, message: "Adelanto anulado." });
  },

  async anularDescuento(req, res) {
    const data = await SueldosService.anularDescuento(req.params.descuentoId, req.body, req.user?.id);
    return res.json({ ok: true, data, message: "Descuento anulado." });
  },

  async getHistorial(req, res) {
    const data = await SueldosService.getHistorial(req.params.empleadoId, req.query);
    return res.json({ ok: true, data });
  },

  async getPeriodosVencidos(req, res) {
    const data = await SueldosService.getPeriodosVencidos();
    return res.json({ ok: true, data });
  },
};

module.exports = SueldosController;
