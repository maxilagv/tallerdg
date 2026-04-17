const { Router } = require("express");
const ClientesController = require("./clientes.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");

const router = Router();

router.use(authMiddleware);

router.get("/", requirePermiso("clientes", "r"), ClientesController.listar);
router.post("/", requirePermiso("clientes", "w"), ClientesController.crear);
router.post("/registro-express", requirePermiso("clientes", "w"), ClientesController.registroExpress);
router.get("/:id/deuda", requirePermiso("clientes", "r"), ClientesController.deuda);
router.get("/:id", requirePermiso("clientes", "r"), ClientesController.obtener);
router.put("/:id", requirePermiso("clientes", "w"), ClientesController.actualizar);
router.delete("/:id", requirePermiso("clientes", "w"), ClientesController.eliminar);

module.exports = router;
