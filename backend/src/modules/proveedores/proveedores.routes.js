const { Router } = require("express");
const ProveedoresController = require("./proveedores.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");

const router = Router();

router.use(authMiddleware);

// ── CRUD ──────────────────────────────────────────────────────────────────
router.get("/", requirePermiso("productos", "r"), ProveedoresController.listar);
router.post("/", requirePermiso("productos", "w"), ProveedoresController.crear);
router.get("/:id", requirePermiso("productos", "r"), ProveedoresController.obtener);
router.put("/:id", requirePermiso("productos", "w"), ProveedoresController.actualizar);
router.delete("/:id", requirePermiso("productos", "w"), ProveedoresController.eliminar);

// ── CUENTA CORRIENTE ──────────────────────────────────────────────────────
router.get(
  "/:id/cuenta-corriente",
  requirePermiso("productos", "r"),
  ProveedoresController.getCuentaCorriente
);
router.post(
  "/:id/cuenta-corriente/activar",
  requirePermiso("productos", "w"),
  ProveedoresController.activarCuentaCorriente
);
router.get(
  "/:id/cuenta-corriente/movimientos",
  requirePermiso("productos", "r"),
  ProveedoresController.getMovimientos
);
router.post(
  "/:id/cuenta-corriente/pago",
  requirePermiso("productos", "w"),
  ProveedoresController.registrarPago
);

module.exports = router;
