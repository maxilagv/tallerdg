exports.up = async function up(knex) {
  await knex.schema.createTable("configuracion", (table) => {
    table.increments("id");
    table.string("clave", 100).notNullable().unique();
    table.text("valor");
    table.string("descripcion", 255);
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("configuracion");
};
