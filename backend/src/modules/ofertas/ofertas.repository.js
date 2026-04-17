const db = require("../../shared/db/knex");

const OfertasRepository = {
  async listar({ page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const [rows, [{ total }]] = await Promise.all([
      db("ofertas").orderBy("created_at", "desc").limit(limit).offset(offset),
      db("ofertas").count("id as total"),
    ]);
    return { rows, total: Number(total), page, limit };
  },

  async findById(id) {
    return db("ofertas").where({ id }).first();
  },

  async crear(data) {
    const [id] = await db("ofertas").insert(data);
    return db("ofertas").where({ id }).first();
  },

  async actualizar(id, data) {
    await db("ofertas").where({ id }).update({ ...data, updated_at: db.fn.now() });
    return db("ofertas").where({ id }).first();
  },

  async eliminar(id) {
    return db("ofertas").where({ id }).delete();
  },
};

module.exports = OfertasRepository;
