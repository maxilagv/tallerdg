const EmpleadosService = require("./empleados.service");

const EmpleadosController = {
  async listar(req, res) {
    const data = await EmpleadosService.listar(req.query);
    return res.json({ ok: true, data });
  },

  async obtener(req, res) {
    const data = await EmpleadosService.obtener(req.params.id);
    return res.json({ ok: true, data });
  },

  async crear(req, res) {
    const data = await EmpleadosService.crear(req.body);
    return res.status(201).json({ ok: true, data });
  },

  async actualizar(req, res) {
    const data = await EmpleadosService.actualizar(req.params.id, req.body);
    return res.json({ ok: true, data });
  },

  async cambiarPassword(req, res) {
    await EmpleadosService.cambiarPassword(req.params.id, req.body, req.user);
    return res.json({ ok: true, message: "Contraseña actualizada." });
  },

  async eliminar(req, res) {
    await EmpleadosService.eliminar(req.params.id, req.user?.id);
    return res.json({ ok: true, message: "Empleado eliminado." });
  },

  async listarRoles(req, res) {
    const data = await EmpleadosService.listarRoles();
    return res.json({ ok: true, data });
  },

  async actualizarRol(req, res) {
    const data = await EmpleadosService.actualizarRol(req.params.id, req.body);
    return res.json({ ok: true, data });
  },
};

module.exports = EmpleadosController;
