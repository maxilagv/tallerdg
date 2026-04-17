const { Router } = require("express");
const multer = require("multer");
const OfertasController = require("./ofertas.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authMiddleware);

router.get("/", requirePermiso("configuracion", "r"), OfertasController.listar);
router.post("/", requirePermiso("configuracion", "w"), upload.single("imagen"), OfertasController.crear);
router.delete("/:id", requirePermiso("configuracion", "w"), OfertasController.eliminar);
router.post("/:id/enviar", requirePermiso("configuracion", "w"), OfertasController.enviar);

module.exports = router;
