const jwt = require("jsonwebtoken");
const config = require("../../config");
const AppError = require("../errors/AppError");
const AuthRepository = require("../../modules/auth/auth.repository");

function isAdmin(user) {
  return user?.permisos?.["*"] === "rw";
}

function requirePermiso(modulo, nivel = "r") {
  return (req, res, next) => {
    const permisos = req.user?.permisos || {};

    if (permisos["*"] === "rw") {
      return next();
    }

    const permisoModulo = permisos[modulo];

    if (!permisoModulo) {
      return next(
        new AppError(
          "No tenes permiso para acceder a esta seccion.",
          403,
          "FORBIDDEN"
        )
      );
    }

    if (nivel === "w" && permisoModulo !== "rw") {
      return next(
        new AppError(
          "Solo podes ver esta seccion, no hacer cambios.",
          403,
          "FORBIDDEN"
        )
      );
    }

    return next();
  };
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) {
    return next(
      new AppError(
        "Esta accion solo puede hacerla el dueño o un administrador.",
        403,
        "ADMIN_REQUIRED"
      )
    );
  }
  return next();
}

// Permite admin sin override, o usuarios autenticados con un token de
// autorizacion del dueño/admin (X-Owner-Authorization) cuyo scope incluya
// el indicado. El token es de uso unico por accion sensible.
function requireOwnerAuthorization(scope) {
  return async (req, res, next) => {
    if (isAdmin(req.user)) {
      req.ownerAuthorization = { byAdmin: true, scope };
      return next();
    }

    const header =
      req.headers["x-owner-authorization"] || req.headers["X-Owner-Authorization"];
    const token = typeof header === "string" ? header.trim() : "";

    if (!token) {
      return next(
        new AppError(
          "Esta accion requiere autorizacion del dueño o administrador.",
          403,
          "OWNER_AUTHORIZATION_REQUIRED"
        )
      );
    }

    try {
      const payload = jwt.verify(token, config.jwtSecret);

      if (payload.kind !== "owner_authorization") {
        throw new Error("invalid_kind");
      }

      const tokenScopes = Array.isArray(payload.scopes)
        ? payload.scopes
        : payload.scope
          ? [payload.scope]
          : [];

      if (!tokenScopes.includes(scope)) {
        throw new Error("invalid_scope");
      }

      let request = null;
      if (payload.requestId) {
        request = await AuthRepository.findAuthorizationRequestById(payload.requestId);
        if (!request || request.estado !== "approved") {
          throw new Error("request_not_approved");
        }
        if (Number(request.solicitante_empleado_id) !== Number(req.user?.id)) {
          throw new Error("request_owner_mismatch");
        }
        if (request.code_expires_at && new Date(request.code_expires_at).getTime() <= Date.now()) {
          await AuthRepository.expireAuthorizationRequest(request.id);
          throw new Error("request_expired");
        }
      }

      req.ownerAuthorization = {
        byAdmin: false,
        scope,
        ownerEmpleadoId: payload.ownerEmpleadoId,
        requestId: payload.requestId || null,
        authorizedPayload: payload.authorizedPayload || null,
      };
      return next();
    } catch (error) {
      return next(
        new AppError(
          "La autorizacion del dueño es invalida o expiro. Volve a pedirla.",
          403,
          "OWNER_AUTHORIZATION_INVALID"
        )
      );
    }
  };
}

module.exports = {
  requirePermiso,
  requireAdmin,
  requireOwnerAuthorization,
  isAdmin,
};
