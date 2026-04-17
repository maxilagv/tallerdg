const { Router } = require("express");
const AppError = require("../../shared/errors/AppError");
const authMiddleware = require("../../shared/middleware/auth.middleware");
const AdminController = require("./admin.controller");

const router = Router();

router.use(authMiddleware);

// Solo administradores (permiso "*": "rw")
router.use((req, _res, next) => {
  if (req.user?.permisos?.["*"] !== "rw") {
    return next(
      new AppError("Solo un administrador puede realizar esta acción.", 403, "FORBIDDEN")
    );
  }
  return next();
});

router.post("/reset", AdminController.resetDatabase);

module.exports = router;
