const OfertasService = require("./ofertas.service");

const OfertasController = {
  async listar(req, res, next) {
    try {
      const data = await OfertasService.listar(req.query);
      res.json({ ok: true, data });
    } catch (error) {
      next(error);
    }
  },

  async crear(req, res, next) {
    try {
      const oferta = await OfertasService.crear(req.body, req.file, req.user?.id);
      res.status(201).json({ ok: true, data: oferta, message: "Oferta creada." });
    } catch (error) {
      next(error);
    }
  },

  async actualizar(req, res, next) {
    try {
      const oferta = await OfertasService.actualizar(req.params.id, req.body, req.file);
      res.json({ ok: true, data: oferta, message: "Oferta actualizada." });
    } catch (error) {
      next(error);
    }
  },

  async eliminar(req, res, next) {
    try {
      await OfertasService.eliminar(req.params.id);
      res.json({ ok: true, message: "Oferta eliminada." });
    } catch (error) {
      next(error);
    }
  },

  async enviar(req, res, next) {
    try {
      const result = await OfertasService.enviar(req.params.id);
      res.json({ ok: true, data: result, message: `Oferta enviada a ${result.enviados} clientes.` });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = OfertasController;
