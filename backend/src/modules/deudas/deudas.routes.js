const { Router } = require("express");
const DeudasController = require("./deudas.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");

const router = Router();

router.use(authMiddleware);

router.get("/resumen-clientes", requirePermiso("clientes", "r"), DeudasController.resumenPorCliente);
router.post(
  "/clientes/:clienteId/recordatorio-whatsapp",
  requirePermiso("clientes", "w"),
  DeudasController.enviarRecordatorioCliente
);
router.get("/",                 requirePermiso("clientes", "r"), DeudasController.listar);
router.post("/",                requirePermiso("clientes", "w"), DeudasController.crear);
router.get("/:id",              requirePermiso("clientes", "r"), DeudasController.obtener);
router.patch("/:id",            requirePermiso("clientes", "w"), DeudasController.actualizar);
router.post("/:id/abonar",      requirePermiso("clientes", "w"), DeudasController.abonar);
router.delete("/:id",           requirePermiso("clientes", "w"), DeudasController.eliminar);

module.exports = router;
