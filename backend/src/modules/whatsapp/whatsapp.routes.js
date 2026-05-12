const { Router } = require("express");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");
const WhatsAppController = require("./whatsapp.controller");

const router = Router();

router.use(authMiddleware);
router.use(requirePermiso("whatsapp", "r"));

router.get("/estado", WhatsAppController.estado);
router.post("/conectar", requirePermiso("whatsapp", "w"), WhatsAppController.conectar);
router.post("/desconectar", requirePermiso("whatsapp", "w"), WhatsAppController.desconectar);
router.post("/reiniciar", requirePermiso("whatsapp", "w"), WhatsAppController.reiniciar);
router.get("/log", WhatsAppController.log);
router.get("/templates", WhatsAppController.templates);
router.put("/templates/:id", requirePermiso("whatsapp", "w"), WhatsAppController.actualizarTemplate);

module.exports = router;
