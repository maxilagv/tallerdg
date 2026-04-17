const { Router } = require("express");
const FinanzasController = require("./finanzas.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");

const router = Router();
router.use(authMiddleware);

// ── Reportes de período (lectura) ─────────────────────────────────────────────
router.get("/resumen",              requirePermiso("finanzas", "r"), FinanzasController.resumen);
router.get("/por-dia",              requirePermiso("finanzas", "r"), FinanzasController.porDia);
router.get("/gastos-por-categoria", requirePermiso("finanzas", "r"), FinanzasController.gastosPorCategoria);
router.get("/movimientos",          requirePermiso("finanzas", "r"), FinanzasController.movimientos);
router.get("/movimientos-mes",      requirePermiso("finanzas", "r"), FinanzasController.movimientosMes);

// ── Análisis inteligente ──────────────────────────────────────────────────────
router.get("/analisis",             requirePermiso("finanzas", "r"), FinanzasController.analisis);

// ── Movimientos del Titular (CRUD) ────────────────────────────────────────────
router.get("/movimientos-titular",        requirePermiso("finanzas", "r"), FinanzasController.listarMovimientosTitular);
router.post("/movimientos-titular",       requirePermiso("finanzas", "w"), FinanzasController.crearMovimientoTitular);
router.put("/movimientos-titular/:id",    requirePermiso("finanzas", "w"), FinanzasController.actualizarMovimientoTitular);
router.delete("/movimientos-titular/:id", requirePermiso("finanzas", "w"), FinanzasController.eliminarMovimientoTitular);

// ── Export Excel ──────────────────────────────────────────────────────────────
router.get("/exportar",             requirePermiso("finanzas", "r"), FinanzasController.exportarExcel);

module.exports = router;
