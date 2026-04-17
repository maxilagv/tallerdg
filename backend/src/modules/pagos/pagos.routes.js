const { Router } = require("express");
const PagosController = require("./pagos.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");

const router = Router();

router.use(authMiddleware);

router.get("/export", requirePermiso("cobros", "r"), PagosController.exportarExcel);
router.get("/", requirePermiso("cobros", "r"), PagosController.listar);
router.post("/", requirePermiso("cobros", "w"), PagosController.crear);
router.delete("/:id", requirePermiso("cobros", "w"), PagosController.anular);

module.exports = router;
