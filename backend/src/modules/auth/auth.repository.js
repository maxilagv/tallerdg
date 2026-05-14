const crypto = require("crypto");
const db = require("../../shared/db/knex");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
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

  async createAuthorizationRequest(data) {
    const [id] = await db("owner_authorization_requests").insert({
      solicitante_empleado_id: data.solicitante_empleado_id,
      scope: data.scope,
      accion: data.accion,
      payload_json: JSON.stringify(data.payload),
      estado: "pending",
    });
    return this.findAuthorizationRequestById(id);
  },

  async listAuthorizationRequests({ estado = "pending", limit = 20 } = {}) {
    const rows = await db("owner_authorization_requests as r")
      .join("empleados as s", "r.solicitante_empleado_id", "s.id")
      .leftJoin("empleados as a", "r.admin_empleado_id", "a.id")
      .where("r.estado", estado)
      .orderBy("r.created_at", "desc")
      .limit(limit)
      .select(
        "r.*",
        db.raw("CONCAT(s.nombre, ' ', s.apellido) as solicitante_nombre"),
        "s.email as solicitante_email",
        db.raw("CONCAT(a.nombre, ' ', a.apellido) as admin_nombre")
      );
    return rows.map(normalizeAuthorizationRequest);
  },

  async findAuthorizationRequestById(id) {
    const row = await db("owner_authorization_requests as r")
      .join("empleados as s", "r.solicitante_empleado_id", "s.id")
      .leftJoin("empleados as a", "r.admin_empleado_id", "a.id")
      .where("r.id", id)
      .select(
        "r.*",
        db.raw("CONCAT(s.nombre, ' ', s.apellido) as solicitante_nombre"),
        "s.email as solicitante_email",
        db.raw("CONCAT(a.nombre, ' ', a.apellido) as admin_nombre")
      )
      .first();
    return normalizeAuthorizationRequest(row);
  },

  async approveAuthorizationRequest(id, adminEmpleadoId, code, expiresAt) {
    await db("owner_authorization_requests")
      .where({ id, estado: "pending" })
      .update({
        estado: "approved",
        admin_empleado_id: adminEmpleadoId,
        code_hash: hashCode(code),
        code_expires_at: expiresAt,
        approved_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
    return this.findAuthorizationRequestById(id);
  },

  async rejectAuthorizationRequest(id, adminEmpleadoId, reason = null) {
    await db("owner_authorization_requests")
      .where({ id, estado: "pending" })
      .update({
        estado: "rejected",
        admin_empleado_id: adminEmpleadoId,
        reject_reason: reason,
        rejected_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
    return this.findAuthorizationRequestById(id);
  },

  async findApprovedAuthorizationRequestByCode(code) {
    const row = await db("owner_authorization_requests as r")
      .join("empleados as s", "r.solicitante_empleado_id", "s.id")
      .leftJoin("empleados as a", "r.admin_empleado_id", "a.id")
      .where("r.estado", "approved")
      .where("r.code_hash", hashCode(code))
      .select(
        "r.*",
        db.raw("CONCAT(s.nombre, ' ', s.apellido) as solicitante_nombre"),
        "s.email as solicitante_email",
        db.raw("CONCAT(a.nombre, ' ', a.apellido) as admin_nombre")
      )
      .first();
    return normalizeAuthorizationRequest(row);
  },

  async markAuthorizationRequestUsed(id) {
    return db("owner_authorization_requests")
      .where({ id, estado: "approved" })
      .update({
        estado: "used",
        used_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
  },

  async expireAuthorizationRequest(id) {
    return db("owner_authorization_requests")
      .where({ id, estado: "approved" })
      .update({
        estado: "expired",
        updated_at: db.fn.now(),
      });
  },
};

function normalizeAuthorizationRequest(row) {
  if (!row) return null;
  let payload = {};
  try {
    payload = typeof row.payload_json === "string"
      ? JSON.parse(row.payload_json)
      : row.payload_json || {};
  } catch {
    payload = {};
  }
  return {
    ...row,
    payload,
    code_hash: undefined,
    payload_json: undefined,
  };
}

module.exports = AuthRepository;
