const { Router } = require("express");
const BusquedaController = require("./busqueda.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");

const router = Router();

router.use(authMiddleware);
router.get("/", BusquedaController.buscar);

module.exports = router;
