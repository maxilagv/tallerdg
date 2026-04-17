const db = require("../../shared/db/knex");

const ConfiguracionRepository = {
  async findAll() {
    const rows = await db("configuracion").select("clave", "valor", "descripcion").orderBy("clave", "asc");
    return rows;
  },

  async upsertMany(entries) {
    if (!entries.length) {
      return;
    }

    await db.transaction(async (trx) => {
      for (const entry of entries) {
        await trx("configuracion")
          .insert({
            clave: entry.clave,
            valor: entry.valor,
            descripcion: entry.descripcion || null,
            updated_at: trx.fn.now(),
          })
          .onConflict("clave")
          .merge({
            valor: entry.valor,
            updated_at: trx.fn.now(),
          });
      }
    });
  },
};

module.exports = ConfiguracionRepository;
