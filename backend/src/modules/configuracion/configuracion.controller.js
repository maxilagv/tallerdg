const ConfiguracionService = require("./configuracion.service");

const ConfiguracionController = {
  async obtener(req, res) {
    const data = await ConfiguracionService.obtener();
    return res.json({ ok: true, data });
  },

  async actualizar(req, res) {
    const data = await ConfiguracionService.actualizar(req.body);
    return res.json({ ok: true, data, message: "Configuracion actualizada." });
  },

  async subirLogo(req, res) {
    const data = await ConfiguracionService.subirLogo(req.file);
    return res.status(201).json({ ok: true, data, message: "Logo actualizado." });
  },
};

module.exports = ConfiguracionController;
