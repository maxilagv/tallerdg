const db = require("../../shared/db/knex");

const GastosRepository = {
  async listCategorias() {
    return db("categorias_gastos").select("id", "nombre").orderBy("nombre", "asc");
  },

  async findCategoriaById(id) {
    return db("categorias_gastos").where({ id }).first();
  },

  async createCategoria(nombre) {
    const [id] = await db("categorias_gastos").insert({ nombre });
    return db("categorias_gastos").where({ id }).first();
  },

  async updateCategoria(id, nombre) {
    await db("categorias_gastos").where({ id }).update({ nombre });
    return db("categorias_gastos").where({ id }).first();
  },

  async deleteCategoria(id) {
    // Solo eliminar si no hay gastos usando esta categoría
    const [{ total }] = await db("gastos").where({ categoria_id: id, activo: 1 }).count("id as total");
    if (Number(total) > 0) return false;
    await db("categorias_gastos").where({ id }).delete();
    return true;
  },

  async findAll({ page, limit, desde, hasta, categoria_id }) {
    const offset = (page - 1) * limit;
    const query = db("gastos as g")
      .join("categorias_gastos as c", "g.categoria_id", "c.id")
      .leftJoin("empleados as e", "g.empleado_id", "e.id")
      .leftJoin("empleados as re", "g.referencia_empleado_id", "re.id")
      .where("g.activo", 1);

    if (desde) {
      query.where("g.fecha", ">=", desde);
    }

    if (hasta) {
      query.where("g.fecha", "<=", hasta);
    }

    if (categoria_id) {
      query.andWhere("g.categoria_id", categoria_id);
    }

    const [rows, [{ total }]] = await Promise.all([
      query
        .clone()
        .orderBy("g.fecha", "desc")
        .limit(limit)
        .offset(offset)
        .select(
          "g.*",
          "c.nombre as categoria_nombre",
          db.raw("CONCAT(COALESCE(e.nombre, ''), ' ', COALESCE(e.apellido, '')) as empleado_nombre"),
          db.raw("CONCAT(COALESCE(re.nombre, ''), ' ', COALESCE(re.apellido, '')) as referencia_empleado_nombre")
        ),
      query.clone().count("g.id as total"),
    ]);

    return { rows, total: Number(total), page, limit };
  },

  async findById(id) {
    return db("gastos").where({ id, activo: 1 }).first();
  },

  async create(data) {
    const [id] = await db("gastos").insert(data);
    return db("gastos as g")
      .join("categorias_gastos as c", "g.categoria_id", "c.id")
      .where("g.id", id)
      .select("g.*", "c.nombre as categoria_nombre")
      .first();
  },

  async update(id, data) {
    await db("gastos").where({ id }).update({ ...data, updated_at: db.fn.now() });
    return db("gastos as g")
      .join("categorias_gastos as c", "g.categoria_id", "c.id")
      .where("g.id", id)
      .select("g.*", "c.nombre as categoria_nombre")
      .first();
  },

  async softDelete(id) {
    await db("gastos").where({ id }).update({
      activo: 0,
      updated_at: db.fn.now(),
    });
  },
};

module.exports = GastosRepository;
