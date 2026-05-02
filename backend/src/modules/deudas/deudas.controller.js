const DeudasService = require("./deudas.service");

const DeudasController = {
  async listar(req, res, next) {
    try {
      const data = await DeudasService.listar(req.query);
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async resumenPorCliente(req, res, next) {
    try {
      const data = await DeudasService.resumenPorCliente();
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async obtener(req, res, next) {
    try {
      const data = await DeudasService.obtener(req.params.id);
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async crear(req, res, next) {
    try {
      const data = await DeudasService.crear(req.body, req.user?.id);
      res.status(201).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async enviarRecordatorioCliente(req, res, next) {
    try {
      const data = await DeudasService.enviarRecordatorioCliente(req.params.clienteId);
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async actualizar(req, res, next) {
    try {
      const data = await DeudasService.actualizar(req.params.id, req.body);
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async abonar(req, res, next) {
    try {
      const data = await DeudasService.abonar(req.params.id, req.body, req.user?.id);
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async eliminar(req, res, next) {
    try {
      await DeudasService.eliminar(req.params.id);
      res.json({ ok: true, message: "Deuda eliminada." });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = DeudasController;
