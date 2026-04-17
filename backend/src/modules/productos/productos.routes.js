const { Router } = require("express");
const multer = require("multer");
const ProductosController = require("./productos.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const { requirePermiso } = require("../../shared/middleware/roles.middleware");

const router = Router();
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(authMiddleware);

router.get("/stock-bajo", requirePermiso("productos", "r"), ProductosController.stockBajo);
router.get("/", requirePermiso("productos", "r"), ProductosController.listar);
router.post(
  "/importar-excel",
  requirePermiso("productos", "w"),
  excelUpload.single("archivo"),
  ProductosController.importarExcel
);
router.post("/", requirePermiso("productos", "w"), ProductosController.crear);
router.get("/:id", requirePermiso("productos", "r"), ProductosController.obtener);
router.put("/:id", requirePermiso("productos", "w"), ProductosController.actualizar);
router.delete("/:id", requirePermiso("productos", "w"), ProductosController.eliminar);
router.post("/:id/ajuste-stock", requirePermiso("productos", "w"), ProductosController.ajustarStock);

module.exports = router;
