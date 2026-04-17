const { Router } = require("express");
const OrdenesController = require("./ordenes.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");

const router = Router();

router.use(authMiddleware);

router.get("/", requirePermiso("ordenes", "r"), OrdenesController.listar);
router.post("/", requirePermiso("ordenes", "w"), OrdenesController.crear);
router.get("/:id", requirePermiso("ordenes", "r"), OrdenesController.obtener);
router.get("/:id/saldo", requirePermiso("ordenes", "r"), OrdenesController.saldo);
router.put("/:id/estado", requirePermiso("ordenes", "w"), OrdenesController.cambiarEstado);
router.put("/:id/notas", requirePermiso("ordenes", "w"), OrdenesController.actualizarNotas);
router.put("/:id/descuento", requirePermiso("ordenes", "w"), OrdenesController.aplicarDescuento);
router.put("/:id/recordatorio-service", requirePermiso("ordenes", "w"), OrdenesController.actualizarRecordatorioService);
router.delete("/:id/recordatorio-service", requirePermiso("ordenes", "w"), OrdenesController.eliminarRecordatorioService);
router.post("/:id/servicios", requirePermiso("ordenes", "w"), OrdenesController.agregarServicio);
router.delete("/:id/servicios/:itemId", requirePermiso("ordenes", "w"), OrdenesController.quitarServicio);
router.post("/:id/productos", requirePermiso("ordenes", "w"), OrdenesController.agregarProducto);
router.post("/:id/productos/batch", requirePermiso("ordenes", "w"), OrdenesController.agregarProductosBatch);
router.delete("/:id/productos/:itemId", requirePermiso("ordenes", "w"), OrdenesController.quitarProducto);
router.get("/:id/remito/pdf", requirePermiso("ordenes", "r"), OrdenesController.descargarRemito);

module.exports = router;
