const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { addDays } = require("date-fns");
const config = require("../../config");
const AuthRepository = require("./auth.repository");
const AppError = require("../../shared/errors/AppError");

function parsePermisos(permisos) {
  return typeof permisos === "string" ? JSON.parse(permisos) : permisos;
}

function toEmpleadoDto(empleado) {
  return {
    id: empleado.id,
    nombre: empleado.nombre,
    apellido: empleado.apellido,
    email: empleado.email,
    rol: empleado.rol_nombre,
    rol_id: empleado.rol_id,
    permisos: parsePermisos(empleado.permisos),
  };
}

function generateAccessToken(empleado) {
  return jwt.sign(
    {
      id: empleado.id,
      nombre: `${empleado.nombre} ${empleado.apellido}`,
      rolId: empleado.rol_id,
      permisos: parsePermisos(empleado.permisos),
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function generateRefreshToken(empleadoId) {
  return jwt.sign({ id: empleadoId }, config.refreshSecret, {
    expiresIn: config.refreshExpiresIn,
  });
}

function isAdminEmpleado(empleado) {
  const permisos = parsePermisos(empleado.permisos);
  return permisos?.["*"] === "rw";
}

function generateAuthorizationCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function toAuthorizationRequestDto(request, includeCode = null) {
  if (!request) return null;
  return {
    id: request.id,
    scope: request.scope,
    accion: request.accion,
    estado: request.estado,
    payload: request.payload,
    solicitante: {
      id: request.solicitante_empleado_id,
      nombre: request.solicitante_nombre,
      email: request.solicitante_email,
    },
    admin: request.admin_empleado_id
      ? {
          id: request.admin_empleado_id,
          nombre: request.admin_nombre,
        }
      : null,
    code: includeCode,
    code_expires_at: request.code_expires_at,
    created_at: request.created_at,
    approved_at: request.approved_at,
    used_at: request.used_at,
    rejected_at: request.rejected_at,
    reject_reason: request.reject_reason,
  };
}

const AuthService = {
  async login(email, password) {
    const empleado = await AuthRepository.findByEmail(email);

    if (!empleado) {
      throw new AppError(
        "Email o contrasena incorrectos.",
        401,
        "INVALID_CREDENTIALS"
      );
    }

    const isValid = await bcrypt.compare(password, empleado.password_hash);

    if (!isValid) {
      throw new AppError(
        "Email o contrasena incorrectos.",
        401,
        "INVALID_CREDENTIALS"
      );
    }

    const accessToken = generateAccessToken(empleado);
    const refreshToken = generateRefreshToken(empleado.id);
    const expiresAt = addDays(new Date(), 7);

    await AuthRepository.saveRefreshToken(empleado.id, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      empleado: toEmpleadoDto(empleado),
    };
  },

  async refresh(token) {
    let payload;

    try {
      payload = jwt.verify(token, config.refreshSecret);
    } catch (error) {
      throw new AppError(
        "Sesion invalida. Inicia sesion de nuevo.",
        401,
        "INVALID_REFRESH"
      );
    }

    const storedToken = await AuthRepository.findRefreshToken(token);

    if (!storedToken) {
      throw new AppError(
        "Sesion expirada. Inicia sesion de nuevo.",
        401,
        "REFRESH_EXPIRED"
      );
    }

    const empleado = await AuthRepository.findEmpleadoById(payload.id);

    if (!empleado) {
      throw new AppError("Usuario no encontrado.", 401, "USER_NOT_FOUND");
    }

    const accessToken = generateAccessToken(empleado);
    const refreshToken = generateRefreshToken(empleado.id);
    const expiresAt = addDays(new Date(), 7);

    await AuthRepository.revokeRefreshToken(token);
    await AuthRepository.saveRefreshToken(empleado.id, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      empleado: toEmpleadoDto(empleado),
    };
  },

  async logout(token) {
    if (token) {
      await AuthRepository.revokeRefreshToken(token);
    }
  },

  // ── Autorizacion del dueño/admin para acciones sensibles ────────────────
  // Valida credenciales de un empleado admin activo y emite un token corto
  // con scope acotado (p.ej. "cash_manual_movements") para autorizar la
  // siguiente accion sensible. No reemplaza la sesion principal del usuario.
  async authorizeOwner(email, password, scope = "cash_manual_movements") {
    const empleado = await AuthRepository.findByEmail(email);

    if (!empleado) {
      throw new AppError(
        "Credenciales del dueño/admin invalidas.",
        401,
        "OWNER_AUTHORIZATION_FAILED"
      );
    }

    const permisos = parsePermisos(empleado.permisos);
    if (permisos?.["*"] !== "rw") {
      throw new AppError(
        "Ese usuario no es dueño ni administrador.",
        403,
        "OWNER_AUTHORIZATION_FAILED"
      );
    }

    const isValid = await bcrypt.compare(password, empleado.password_hash);
    if (!isValid) {
      throw new AppError(
        "Credenciales del dueño/admin invalidas.",
        401,
        "OWNER_AUTHORIZATION_FAILED"
      );
    }

    const expiresInSeconds = 5 * 60; // 5 minutos
    const token = jwt.sign(
      {
        kind: "owner_authorization",
        ownerEmpleadoId: empleado.id,
        scopes: [scope],
      },
      config.jwtSecret,
      { expiresIn: expiresInSeconds }
    );

    return {
      token,
      expiresIn: expiresInSeconds,
      scope,
      owner: {
        id: empleado.id,
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        email: empleado.email,
      },
    };
  },

  async createAuthorizationRequest({ scope, accion, payload }, solicitanteEmpleadoId) {
    const empleado = await AuthRepository.findEmpleadoById(solicitanteEmpleadoId);
    if (!empleado) {
      throw new AppError("Usuario no encontrado.", 401, "USER_NOT_FOUND");
    }

    if (isAdminEmpleado(empleado)) {
      throw new AppError("El administrador puede operar esta accion directamente.", 400, "ADMIN_DOES_NOT_NEED_REQUEST");
    }

    const request = await AuthRepository.createAuthorizationRequest({
      solicitante_empleado_id: solicitanteEmpleadoId,
      scope,
      accion,
      payload,
    });
    return toAuthorizationRequestDto(request);
  },

  async listAuthorizationRequests(query = {}) {
    const estado = query.status || query.estado || "pending";
    const limit = Math.min(Number(query.limit) || 20, 100);
    const requests = await AuthRepository.listAuthorizationRequests({ estado, limit });
    return requests.map((request) => toAuthorizationRequestDto(request));
  },

  async approveAuthorizationRequest(id, adminEmpleadoId) {
    const request = await AuthRepository.findAuthorizationRequestById(id);
    if (!request) {
      throw new AppError("Solicitud no encontrada.", 404, "AUTH_REQUEST_NOT_FOUND");
    }
    if (request.estado !== "pending") {
      throw new AppError("La solicitud ya no esta pendiente.", 409, "AUTH_REQUEST_NOT_PENDING");
    }

    const code = generateAuthorizationCode();
    const expiresAt = addMinutes(new Date(), 10);
    const approved = await AuthRepository.approveAuthorizationRequest(id, adminEmpleadoId, code, expiresAt);
    return toAuthorizationRequestDto(approved, code);
  },

  async rejectAuthorizationRequest(id, adminEmpleadoId, reason = null) {
    const request = await AuthRepository.findAuthorizationRequestById(id);
    if (!request) {
      throw new AppError("Solicitud no encontrada.", 404, "AUTH_REQUEST_NOT_FOUND");
    }
    if (request.estado !== "pending") {
      throw new AppError("La solicitud ya no esta pendiente.", 409, "AUTH_REQUEST_NOT_PENDING");
    }

    const rejected = await AuthRepository.rejectAuthorizationRequest(id, adminEmpleadoId, reason);
    return toAuthorizationRequestDto(rejected);
  },

  async redeemAuthorizationRequest(requestId, code, empleadoId) {
    const request = await AuthRepository.findApprovedAuthorizationRequestByCode(code);
    if (!request || Number(request.id) !== Number(requestId)) {
      throw new AppError("Codigo invalido.", 403, "AUTH_CODE_INVALID");
    }
    if (Number(request.solicitante_empleado_id) !== Number(empleadoId)) {
      throw new AppError("Este codigo pertenece a otro usuario.", 403, "AUTH_CODE_FORBIDDEN");
    }
    if (request.code_expires_at && new Date(request.code_expires_at).getTime() <= Date.now()) {
      await AuthRepository.expireAuthorizationRequest(request.id);
      throw new AppError("El codigo expiro. Pedi una nueva autorizacion.", 403, "AUTH_CODE_EXPIRED");
    }

    const expiresInSeconds = 5 * 60;
    const token = jwt.sign(
      {
        kind: "owner_authorization",
        ownerEmpleadoId: request.admin_empleado_id,
        scopes: [request.scope],
        requestId: request.id,
        authorizedPayload: request.payload,
      },
      config.jwtSecret,
      { expiresIn: expiresInSeconds }
    );

    return {
      token,
      expiresIn: expiresInSeconds,
      request: toAuthorizationRequestDto(request),
    };
  },
};

module.exports = AuthService;
