const ProveedoresService = require("./proveedores.service");

const ProveedoresController = {
  // ── CRUD ──────────────────────────────────────────────────────────────────

  async listar(req, res) {
    const data = await ProveedoresService.listar(req.query);
    return res.json({ ok: true, data });
  },

  async obtener(req, res) {
    const data = await ProveedoresService.obtener(req.params.id);
    return res.json({ ok: true, data });
  },

  async crear(req, res) {
    const data = await ProveedoresService.crear(req.body, req.user?.id);
    return res.status(201).json({ ok: true, data });
  },

  async actualizar(req, res) {
    const data = await ProveedoresService.actualizar(req.params.id, req.body);
    return res.json({ ok: true, data });
  },

  async eliminar(req, res) {
    await ProveedoresService.eliminar(req.params.id);
    return res.json({ ok: true, message: "Proveedor eliminado." });
  },

  // ── CUENTA CORRIENTE ──────────────────────────────────────────────────────

  async getCuentaCorriente(req, res) {
    const data = await ProveedoresService.getCuentaCorriente(req.params.id);
    return res.json({ ok: true, data });
  },

  async activarCuentaCorriente(req, res) {
    const data = await ProveedoresService.activarCuentaCorriente(
      req.params.id,
      req.body,
      req.user?.id
    );
    return res.json({ ok: true, data });
  },

  async registrarPago(req, res) {
    const data = await ProveedoresService.registrarPago(
      req.params.id,
      req.body,
      req.user?.id
    );
    return res.json({ ok: true, data });
  },

  async getMovimientos(req, res) {
    const data = await ProveedoresService.getMovimientos(
      req.params.id,
      req.query
    );
    return res.json({ ok: true, data });
  },
};

module.exports = ProveedoresController;
