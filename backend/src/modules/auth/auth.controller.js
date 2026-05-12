const AuthService = require("./auth.service");
const { loginSchema, ownerAuthorizationSchema } = require("./auth.validation");
const AppError = require("../../shared/errors/AppError");
const config = require("../../config");

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

    const result = await AuthService.refresh(token);

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
    res.clearCookie(REFRESH_COOKIE, getCookieOptions());
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
};

module.exports = AuthController;
