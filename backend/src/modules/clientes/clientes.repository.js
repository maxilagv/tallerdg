const db = require("../../shared/db/knex");

const ClientesRepository = {
  async findAll({ page, limit, q }) {
    const offset = (page - 1) * limit;
    const query = db("clientes as c").where("c.activo", 1);

    if (q) {
      const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      query.andWhere(function applySearch() {
        for (const term of terms) {
          this.andWhere(function () {
            this.where("c.nombre", "like", `%${term}%`)
              .orWhere("c.apellido", "like", `%${term}%`)
              .orWhere("c.telefono", "like", `%${term}%`);
          });
        }
      });
    }

    const [rows, [{ total }]] = await Promise.all([
      query
        .clone()
        .orderBy("c.apellido", "asc")
        .limit(limit)
        .offset(offset)
        .select(
          "c.id",
          "c.nombre",
          "c.apellido",
          "c.telefono",
          "c.email",
          "c.created_at",
          db.raw(
            "(SELECT COUNT(*) FROM vehiculos v WHERE v.cliente_id = c.id AND v.activo = 1) AS total_vehiculos"
          )
        ),
      query.clone().count("c.id as total"),
    ]);

    return { rows, total: Number(total), page, limit };
  },

  async findById(id) {
    return db("clientes").where({ id, activo: 1 }).first();
  },

  async findByTelefono(telefono) {
    return db("clientes").where({ telefono, activo: 1 }).first();
  },

  async findByIdConVehiculos(id) {
    const cliente = await db("clientes").where({ id, activo: 1 }).first();

    if (!cliente) {
      return null;
    }

    const vehiculos = await db("vehiculos")
      .where({ cliente_id: id, activo: 1 })
      .orderBy("created_at", "desc")
      .select(
        "id",
        "patente",
        "marca",
        "modelo",
        "anio",
        "color",
        "tipo_combustible",
        "km_ultimo_ingreso"
      );

    return { ...cliente, vehiculos };
  },

  async create(data) {
    const payload = {
      ...data,
      email: data.email || null,
      telefono: data.telefono || null,
      direccion: data.direccion || null,
      notas: data.notas || null,
    };

    const [id] = await db("clientes").insert(payload);
    return db("clientes").where({ id }).first();
  },

  async update(id, data) {
    const payload = {
      ...data,
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.telefono !== undefined && { telefono: data.telefono || null }),
      ...(data.direccion !== undefined && { direccion: data.direccion || null }),
      ...(data.notas !== undefined && { notas: data.notas || null }),
      updated_at: db.fn.now(),
    };

    await db("clientes").where({ id }).update(payload);
    return db("clientes").where({ id }).first();
  },

  async softDelete(id) {
    return db("clientes")
      .where({ id })
      .update({ activo: 0, updated_at: db.fn.now() });
  },
};

module.exports = ClientesRepository;
