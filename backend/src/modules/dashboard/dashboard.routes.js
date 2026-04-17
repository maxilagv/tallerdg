const { Router } = require("express");
const DashboardController = require("./dashboard.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");

const router = Router();

router.use(authMiddleware);
router.get("/hoy", DashboardController.hoy);

module.exports = router;
