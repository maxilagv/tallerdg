const db = require("../../shared/db/knex");

const CategoriasRepository = {
  async findAll(tipo) {
    const query = db("categorias").select("id", "nombre", "tipo").orderBy("nombre", "asc");

    if (tipo) {
      query.where({ tipo });
    }

    return query;
  },

  async findById(id) {
    return db("categorias").where({ id }).first();
  },

  async create(nombre, tipo) {
    const [id] = await db("categorias").insert({ nombre, tipo });
    return db("categorias").select("id", "nombre", "tipo").where({ id }).first();
  },

  async update(id, nombre) {
    await db("categorias").where({ id }).update({ nombre });
    return db("categorias").select("id", "nombre", "tipo").where({ id }).first();
  },

  async countProductos(id) {
    const row = await db("productos").where({ categoria_id: id, activo: 1 }).count("id as total").first();
    return Number(row.total);
  },

  async countServicios(id) {
    const row = await db("servicios").where({ categoria_id: id }).count("id as total").first();
    return Number(row.total);
  },

  async delete(id) {
    return db("categorias").where({ id }).del();
  },
};

module.exports = CategoriasRepository;
