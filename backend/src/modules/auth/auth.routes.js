const { Router } = require("express");
const AuthController = require("./auth.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");

const router = Router();

router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);
router.get("/me", authMiddleware, AuthController.me);
router.post("/owner-authorization", authMiddleware, AuthController.ownerAuthorization);

module.exports = router;
