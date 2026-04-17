const { Router } = require("express");
const EmpleadosController = require("./empleados.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");

const router = Router();

router.use(authMiddleware);

router.get("/roles", requirePermiso("empleados", "r"), EmpleadosController.listarRoles);
router.put("/roles/:id", requirePermiso("empleados", "w"), EmpleadosController.actualizarRol);
router.get("/", requirePermiso("empleados", "r"), EmpleadosController.listar);
router.post("/", requirePermiso("empleados", "w"), EmpleadosController.crear);
router.get("/:id", requirePermiso("empleados", "r"), EmpleadosController.obtener);
router.put("/:id", requirePermiso("empleados", "w"), EmpleadosController.actualizar);
router.put("/:id/password", EmpleadosController.cambiarPassword);
router.delete("/:id", requirePermiso("empleados", "w"), EmpleadosController.eliminar);

module.exports = router;
