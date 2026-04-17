const { Router } = require("express");
const multer = require("multer");
const ServiciosController = require("./servicios.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");

const router = Router();
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(authMiddleware);

router.get("/", requirePermiso("servicios", "r"), ServiciosController.listar);
router.post(
  "/importar-excel",
  requirePermiso("servicios", "w"),
  excelUpload.single("archivo"),
  ServiciosController.importarExcel
);
router.post("/", requirePermiso("servicios", "w"), ServiciosController.crear);
router.get("/:id", requirePermiso("servicios", "r"), ServiciosController.obtener);
router.put("/:id", requirePermiso("servicios", "w"), ServiciosController.actualizar);
router.delete("/:id", requirePermiso("servicios", "w"), ServiciosController.eliminar);
router.put("/precio-masivo/actualizar", requirePermiso("servicios", "w"), ServiciosController.precioMasivo);

module.exports = router;
