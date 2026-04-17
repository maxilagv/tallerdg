const db = require("../../shared/db/knex");

const ServiciosRepository = {
  async findAll({ page, limit, categoria_id, q }) {
    const offset = (page - 1) * limit;
    const query = db("servicios as s")
      .join("categorias as c", "s.categoria_id", "c.id")
      .where("s.activo", 1)
      .where("c.tipo", "servicio");

    if (categoria_id) {
      query.andWhere("s.categoria_id", categoria_id);
    }

    if (q) {
      query.andWhere(function applySearch() {
        this.where("s.nombre", "like", `%${q}%`).orWhere("s.descripcion", "like", `%${q}%`);
      });
    }

    const [rows, [{ total }]] = await Promise.all([
      query
        .clone()
        .orderBy("s.nombre", "asc")
        .limit(limit)
        .offset(offset)
        .select(
          "s.id",
          "s.categoria_id",
          "s.nombre",
          "s.descripcion",
          "s.precio_base",
          "s.tiempo_estimado_min",
          "s.created_at",
          "c.nombre as categoria_nombre"
        ),
      query.clone().count("s.id as total"),
    ]);

    return { rows, total: Number(total), page, limit };
  },

  async findById(id) {
    return db("servicios as s")
      .join("categorias as c", "s.categoria_id", "c.id")
      .where("s.id", id)
      .where("s.activo", 1)
      .select("s.*", "c.nombre as categoria_nombre")
      .first();
  },

  async create(data) {
    const payload = {
      ...data,
      descripcion: data.descripcion || null,
    };

    const [id] = await db("servicios").insert(payload);
    return this.findById(id);
  },

  async update(id, data) {
    const payload = {
      ...data,
      ...(data.descripcion !== undefined && { descripcion: data.descripcion || null }),
      updated_at: db.fn.now(),
    };

    await db("servicios").where({ id }).update(payload);
    return this.findById(id);
  },

  async softDelete(id) {
    return db("servicios")
      .where({ id })
      .update({ activo: 0, updated_at: db.fn.now() });
  },

  async applyMassiveIncrease({ porcentaje, categoria_id }) {
    const query = db("servicios").where("activo", 1);

    if (categoria_id) {
      query.andWhere({ categoria_id });
    }

    await query.update({
      precio_base: db.raw("ROUND(precio_base * (1 + ? / 100), 2)", [porcentaje]),
      updated_at: db.fn.now(),
    });
  },
};

module.exports = ServiciosRepository;
