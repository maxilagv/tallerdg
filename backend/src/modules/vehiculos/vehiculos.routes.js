const { Router } = require("express");
const VehiculosController = require("./vehiculos.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");

const router = Router();

router.use(authMiddleware);

router.get("/", requirePermiso("vehiculos", "r"), VehiculosController.listar);
router.post("/", requirePermiso("vehiculos", "w"), VehiculosController.crear);
router.get("/by-patente/:patente", requirePermiso("vehiculos", "r"), VehiculosController.buscarPorPatente);
router.get("/:id/historial", requirePermiso("vehiculos", "r"), VehiculosController.historial);
router.get("/:id", requirePermiso("vehiculos", "r"), VehiculosController.obtener);
router.put("/:id", requirePermiso("vehiculos", "w"), VehiculosController.actualizar);
router.delete("/:id", requirePermiso("vehiculos", "w"), VehiculosController.eliminar);

module.exports = router;
