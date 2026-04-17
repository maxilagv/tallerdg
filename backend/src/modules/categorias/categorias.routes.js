const { Router } = require("express");
const CategoriasController = require("./categorias.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");

const router = Router();

router.use(authMiddleware);

router.get("/",     CategoriasController.listar);
router.post("/",    requirePermiso("productos", "w"), CategoriasController.crear);
router.put("/:id",  requirePermiso("productos", "w"), CategoriasController.actualizar);
router.delete("/:id", requirePermiso("productos", "w"), CategoriasController.eliminar);

module.exports = router;
