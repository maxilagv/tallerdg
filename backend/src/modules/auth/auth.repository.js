const crypto = require("crypto");
const db = require("../../shared/db/knex");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const empleadoSelect = [
  "empleados.id",
  "empleados.nombre",
  "empleados.apellido",
  "empleados.email",
  "empleados.password_hash",
  "empleados.rol_id",
  "roles.nombre as rol_nombre",
  "roles.permisos",
];

const AuthRepository = {
  async findByEmail(email) {
    return db("empleados")
      .join("roles", "empleados.rol_id", "roles.id")
      .where("empleados.email", email)
      .where("empleados.activo", 1)
      .select(empleadoSelect)
      .first();
  },

  async saveRefreshToken(empleadoId, token, expiresAt) {
    const [id] = await db("refresh_tokens").insert({
      empleado_id: empleadoId,
      token_hash: hashToken(token),
      expires_at: expiresAt,
      revocado: 0,
    });

    return id;
  },

  async findRefreshToken(token) {
    return db("refresh_tokens")
      .where({ token_hash: hashToken(token), revocado: 0 })
      .where("expires_at", ">", new Date())
      .first();
  },

  async revokeRefreshToken(token) {
    return db("refresh_tokens")
      .where({ token_hash: hashToken(token) })
      .update({ revocado: 1 });
  },

  async findEmpleadoById(id) {
    return db("empleados")
      .join("roles", "empleados.rol_id", "roles.id")
      .where("empleados.id", id)
      .where("empleados.activo", 1)
      .select(empleadoSelect.filter((field) => field !== "empleados.password_hash"))
      .first();
  },
};

module.exports = AuthRepository;
