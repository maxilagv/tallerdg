const { Router } = require("express");
const SueldosController = require("./sueldos.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");

const router = Router();
router.use(authMiddleware);
router.use(requirePermiso("empleados", "r"));

// Resumen general de todos los empleados
router.get("/", SueldosController.getResumen);

// Alertas (períodos vencidos) — usado por el dashboard
router.get("/alertas/vencidos", SueldosController.getPeriodosVencidos);

// Config de sueldo por empleado
router.get("/:empleadoId/config", SueldosController.getConfig);
router.put("/:empleadoId/config", requirePermiso("empleados", "w"), SueldosController.upsertConfig);

// Períodos
router.post("/:empleadoId/periodos", requirePermiso("empleados", "w"), SueldosController.abrirPeriodo);
router.get("/:empleadoId/historial", SueldosController.getHistorial);

// Liquidar un período específico
router.patch("/periodos/:periodoId", requirePermiso("empleados", "w"), SueldosController.actualizarPeriodo);
router.post("/periodos/:periodoId/liquidar", requirePermiso("empleados", "w"), SueldosController.liquidar);

// Adelantos
router.post("/adelantos/:adelantoId/anular", requirePermiso("empleados", "w"), SueldosController.anularAdelanto);
router.post("/periodos/:periodoId/adelantos", requirePermiso("empleados", "w"), SueldosController.registrarAdelanto);

module.exports = router;
