const { Router } = require("express");
const GastosController = require("./gastos.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");

const router = Router();

router.use(authMiddleware);

router.get("/categorias",       requirePermiso("gastos", "r"), GastosController.listarCategorias);
router.post("/categorias",      requirePermiso("gastos", "w"), GastosController.crearCategoria);
router.put("/categorias/:id",   requirePermiso("gastos", "w"), GastosController.actualizarCategoria);
router.delete("/categorias/:id",requirePermiso("gastos", "w"), GastosController.eliminarCategoria);
router.get("/", requirePermiso("gastos", "r"), GastosController.listar);
router.post("/", requirePermiso("gastos", "w"), GastosController.crear);
router.put("/:id", requirePermiso("gastos", "w"), GastosController.actualizar);
router.delete("/:id", requirePermiso("gastos", "w"), GastosController.eliminar);

module.exports = router;
