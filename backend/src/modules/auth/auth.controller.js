const AuthService = require("./auth.service");
const {
  loginSchema,
  ownerAuthorizationSchema,
  ownerAuthorizationRequestSchema,
  rejectAuthorizationRequestSchema,
  redeemAuthorizationRequestSchema,
} = require("./auth.validation");
const AppError = require("../../shared/errors/AppError");
const config = require("../../config");
const { isAdmin } = require("../../shared/middleware/roles.middleware");

const ALLOWED_OWNER_SCOPES = new Set(["cash_manual_movements"]);

const REFRESH_COOKIE = "refreshToken";

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

function getClearCookieOptions() {
  const { maxAge, ...options } = getCookieOptions();
  return options;
}

const AuthController = {
  async login(req, res) {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const result = await AuthService.login(parsed.data.email, parsed.data.password);

    res.cookie(REFRESH_COOKIE, result.refreshToken, getCookieOptions());

    return res.json({
      ok: true,
      accessToken: result.accessToken,
      empleado: result.empleado,
    });
  },

  async refresh(req, res) {
    const token = req.cookies?.[REFRESH_COOKIE];

    if (!token) {
      throw new AppError("No hay sesion activa.", 401, "NO_REFRESH");
    }

    let result;

    try {
      result = await AuthService.refresh(token);
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, getClearCookieOptions());
      throw error;
    }

    res.cookie(REFRESH_COOKIE, result.refreshToken, getCookieOptions());

    return res.json({
      ok: true,
      accessToken: result.accessToken,
      empleado: result.empleado,
    });
  },

  async logout(req, res) {
    const token = req.cookies?.[REFRESH_COOKIE];
    await AuthService.logout(token);
    res.clearCookie(REFRESH_COOKIE, getClearCookieOptions());
    return res.json({ ok: true, message: "Sesion cerrada." });
  },

  async me(req, res) {
    return res.json({ ok: true, empleado: req.user });
  },

  async ownerAuthorization(req, res) {
    const parsed = ownerAuthorizationSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const scope = parsed.data.scope || "cash_manual_movements";

    if (!ALLOWED_OWNER_SCOPES.has(scope)) {
      throw new AppError(
        "Motivo de autorizacion no permitido.",
        400,
        "INVALID_SCOPE"
      );
    }

    const result = await AuthService.authorizeOwner(
      parsed.data.email,
      parsed.data.password,
      scope
    );

    return res.json({ ok: true, ...result });
  },

  async createAuthorizationRequest(req, res) {
    const parsed = ownerAuthorizationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }
    if (!ALLOWED_OWNER_SCOPES.has(parsed.data.scope)) {
      throw new AppError("Motivo de autorizacion no permitido.", 400, "INVALID_SCOPE");
    }

    const data = await AuthService.createAuthorizationRequest(parsed.data, req.user?.id);
    return res.status(201).json({ ok: true, data });
  },

  async listAuthorizationRequests(req, res) {
    if (!isAdmin(req.user)) {
      throw new AppError("Esta accion solo puede hacerla el dueño o un administrador.", 403, "ADMIN_REQUIRED");
    }
    const data = await AuthService.listAuthorizationRequests(req.query);
    return res.json({ ok: true, data });
  },

  async approveAuthorizationRequest(req, res) {
    if (!isAdmin(req.user)) {
      throw new AppError("Esta accion solo puede hacerla el dueño o un administrador.", 403, "ADMIN_REQUIRED");
    }
    const data = await AuthService.approveAuthorizationRequest(Number(req.params.id), req.user?.id);
    return res.json({ ok: true, data });
  },

  async rejectAuthorizationRequest(req, res) {
    if (!isAdmin(req.user)) {
      throw new AppError("Esta accion solo puede hacerla el dueño o un administrador.", 403, "ADMIN_REQUIRED");
    }
    const parsed = rejectAuthorizationRequestSchema.safeParse(req.body || {});
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }
    const data = await AuthService.rejectAuthorizationRequest(
      Number(req.params.id),
      req.user?.id,
      parsed.data.reason || null
    );
    return res.json({ ok: true, data });
  },

  async redeemAuthorizationRequest(req, res) {
    const parsed = redeemAuthorizationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }
    const data = await AuthService.redeemAuthorizationRequest(
      parsed.data.requestId,
      parsed.data.code,
      req.user?.id
    );
    return res.json({ ok: true, ...data });
  },
};

module.exports = AuthController;
