exports.up = async (knex) => {
  await knex.schema.createTable("ofertas", (t) => {
    t.increments("id");
    t.string("titulo", 255).notNullable();
    t.text("mensaje").notNullable();
    t.string("imagen_url", 500).nullable();
    t.string("imagen_public_id", 255).nullable();
    t.datetime("programada_para").nullable();
    t.datetime("enviada_at").nullable();
    t.integer("total_enviados").unsigned().defaultTo(0);
    t.integer("creado_por").unsigned().references("id").inTable("empleados").nullable();
    t.timestamps(true, true);
    t.index("programada_para");
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists("ofertas");
};
