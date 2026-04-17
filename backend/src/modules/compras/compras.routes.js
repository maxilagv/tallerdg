const { Router } = require("express");
const ComprasController = require("./compras.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");

const router = Router();

router.use(authMiddleware);

router.get("/",     requirePermiso("productos", "r"), ComprasController.listar);
router.post("/",    requirePermiso("productos", "w"), ComprasController.crear);
router.get("/:id",  requirePermiso("productos", "r"), ComprasController.obtener);
router.delete("/:id", requirePermiso("productos", "w"), ComprasController.eliminar);

module.exports = router;
