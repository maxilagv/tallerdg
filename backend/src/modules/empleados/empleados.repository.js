const db = require("../../shared/db/knex");

const EmpleadosRepository = {
  async findAll({ page, limit, q }) {
    const offset = (page - 1) * limit;
    const query = db("empleados as e").join("roles as r", "e.rol_id", "r.id");

    if (q) {
      query.andWhere(function applySearch() {
        this.where("e.nombre", "like", `%${q}%`)
          .orWhere("e.apellido", "like", `%${q}%`)
          .orWhere("e.email", "like", `%${q}%`);
      });
    }

    const [rows, [{ total }]] = await Promise.all([
      query
        .clone()
        .orderBy("e.apellido", "asc")
        .limit(limit)
        .offset(offset)
        .select(
          "e.id",
          "e.rol_id",
          "e.nombre",
          "e.apellido",
          "e.telefono",
          "e.email",
          "e.activo",
          "e.created_at",
          "r.nombre as rol_nombre",
          "r.permisos"
        ),
      query.clone().count("e.id as total"),
    ]);

    return { rows, total: Number(total), page, limit };
  },

  async findById(id) {
    return db("empleados as e")
      .join("roles as r", "e.rol_id", "r.id")
      .where("e.id", id)
      .select(
        "e.id",
        "e.rol_id",
        "e.nombre",
        "e.apellido",
        "e.telefono",
        "e.email",
        "e.activo",
        "e.created_at",
        "r.nombre as rol_nombre",
        "r.permisos"
      )
      .first();
  },

  async findByEmail(email) {
    return db("empleados").whereRaw("LOWER(email) = LOWER(?)", [email]).first();
  },

  async create(data) {
    const [id] = await db("empleados").insert(data);
    return this.findById(id);
  },

  async update(id, data) {
    await db("empleados").where({ id }).update({ ...data, updated_at: db.fn.now() });
    return this.findById(id);
  },

  async updatePassword(id, passwordHash) {
    await db("empleados").where({ id }).update({
      password_hash: passwordHash,
      updated_at: db.fn.now(),
    });
  },

  async softDelete(id) {
    await db("empleados").where({ id }).update({
      activo: 0,
      updated_at: db.fn.now(),
    });
  },

  async countAdminsActivos() {
    const [{ total }] = await db("empleados").where({ rol_id: 1, activo: 1 }).count("id as total");
    return Number(total);
  },

  async listRoles() {
    return db("roles").select("id", "nombre", "permisos").orderBy("id", "asc");
  },

  async findRoleById(id) {
    return db("roles").where({ id }).first();
  },

  async updateRole(id, data) {
    await db("roles").where({ id }).update({ ...data, updated_at: db.fn.now() });
    return this.findRoleById(id);
  },
};

module.exports = EmpleadosRepository;
