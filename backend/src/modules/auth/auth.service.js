const bcrypt = require("bcryptjs");
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
};

module.exports = AuthService;
