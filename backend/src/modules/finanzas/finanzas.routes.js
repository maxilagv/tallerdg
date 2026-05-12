const { Router } = require("express");
const FinanzasController = require("./finanzas.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const {
  requirePermiso,
  requireAdmin,
  requireOwnerAuthorization,
} = require("../../shared/middleware/roles.middleware");

const router = Router();
router.use(authMiddleware);

// ── Reportes de período (lectura) ─────────────────────────────────────────────
router.get("/resumen",              requirePermiso("finanzas", "r"), FinanzasController.resumen);
router.get("/por-dia",              requirePermiso("finanzas", "r"), FinanzasController.porDia);
router.get("/gastos-por-categoria", requirePermiso("finanzas", "r"), FinanzasController.gastosPorCategoria);
router.get("/movimientos",          requirePermiso("finanzas", "r"), FinanzasController.movimientos);
router.get("/movimientos-detalle",  requirePermiso("finanzas", "r"), FinanzasController.movimientosDetalle);
router.get("/movimientos-mes",      requirePermiso("finanzas", "r"), FinanzasController.movimientosMes);

// ── Análisis inteligente ──────────────────────────────────────────────────────
router.get("/analisis",             requirePermiso("finanzas", "r"), FinanzasController.analisis);

// ── Reset de caja (un solo uso) ───────────────────────────────────────────────
// El estado se ve con permiso de lectura. El reset queda reservado al dueño/admin.
router.get("/reset-caja",            requirePermiso("finanzas", "r"), FinanzasController.estadoResetCaja);
router.post("/reset-caja",           requireAdmin,                    FinanzasController.resetCaja);

// ── Movimientos del Titular (CRUD) ────────────────────────────────────────────
// Lectura: cualquier rol que pueda ver finanzas.
// Escritura: admin sin override; recepcionista solo con X-Owner-Authorization
// emitido por el endpoint POST /api/auth/owner-authorization.
router.get("/movimientos-titular",        requirePermiso("finanzas", "r"),                       FinanzasController.listarMovimientosTitular);
router.post("/movimientos-titular",       requireOwnerAuthorization("cash_manual_movements"),    FinanzasController.crearMovimientoTitular);
router.put("/movimientos-titular/:id",    requireOwnerAuthorization("cash_manual_movements"),    FinanzasController.actualizarMovimientoTitular);
router.delete("/movimientos-titular/:id", requireOwnerAuthorization("cash_manual_movements"),    FinanzasController.eliminarMovimientoTitular);

// ── Export Excel ──────────────────────────────────────────────────────────────
router.get("/exportar",             requirePermiso("finanzas", "r"), FinanzasController.exportarExcel);

module.exports = router;
