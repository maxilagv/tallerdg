const { Router } = require("express");
const VentasRapidasController = require("./ventas_rapidas.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");

const router = Router();

router.use(authMiddleware);

router.get("/",               requirePermiso("productos", "r"), VentasRapidasController.listar);
router.get("/saldo-caja-hoy", requirePermiso("productos", "r"), VentasRapidasController.saldoCajaHoy);
router.get("/:id/comprobante/pdf", requirePermiso("productos", "r"), VentasRapidasController.imprimirComprobante);
router.get("/:id",            requirePermiso("productos", "r"), VentasRapidasController.obtener);
router.post("/",              requirePermiso("productos", "w"), VentasRapidasController.crear);

module.exports = router;
