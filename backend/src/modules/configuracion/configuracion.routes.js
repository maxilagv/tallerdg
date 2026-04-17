const { Router } = require("express");
const ConfiguracionController = require("./configuracion.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");
const upload = require("../../shared/middleware/upload.middleware");

const router = Router();

// GET es público: el nombre y datos del taller no son sensibles y se
// necesitan en la pantalla de login/carga antes de autenticar.
router.get("/", ConfiguracionController.obtener);

// El resto requiere autenticación y permisos
router.put("/", authMiddleware, requirePermiso("configuracion", "w"), ConfiguracionController.actualizar);
router.post(
  "/logo",
  authMiddleware,
  requirePermiso("configuracion", "w"),
  upload.single("logo"),
  ConfiguracionController.subirLogo
);

module.exports = router;
