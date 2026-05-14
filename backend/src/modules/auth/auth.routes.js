const { Router } = require("express");
const AuthController = require("./auth.controller");
const authMiddleware = require("../../shared/middleware/auth.middleware");

const router = Router();

router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);
router.get("/me", authMiddleware, AuthController.me);
router.post("/owner-authorization", authMiddleware, AuthController.ownerAuthorization);
router.post("/owner-authorization-requests", authMiddleware, AuthController.createAuthorizationRequest);
router.get("/owner-authorization-requests", authMiddleware, AuthController.listAuthorizationRequests);
router.post("/owner-authorization-requests/:id/approve", authMiddleware, AuthController.approveAuthorizationRequest);
router.post("/owner-authorization-requests/:id/reject", authMiddleware, AuthController.rejectAuthorizationRequest);
router.post("/owner-authorization-requests/redeem", authMiddleware, AuthController.redeemAuthorizationRequest);

module.exports = router;
