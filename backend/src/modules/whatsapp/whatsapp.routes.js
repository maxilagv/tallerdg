const { Router } = require("express");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");
const WhatsAppController = require("./whatsapp.controller");

const router = Router();

router.use(authMiddleware);
router.use(requirePermiso("configuracion", "r"));

router.get("/estado", WhatsAppController.estado);
router.post("/conectar", requirePermiso("configuracion", "w"), WhatsAppController.conectar);
router.post("/desconectar", requirePermiso("configuracion", "w"), WhatsAppController.desconectar);
router.post("/reiniciar", requirePermiso("configuracion", "w"), WhatsAppController.reiniciar);
router.get("/log", WhatsAppController.log);
router.get("/templates", WhatsAppController.templates);
router.put("/templates/:id", requirePermiso("configuracion", "w"), WhatsAppController.actualizarTemplate);

module.exports = router;
