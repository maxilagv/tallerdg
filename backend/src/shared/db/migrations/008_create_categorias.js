exports.up = async function up(knex) {
  await knex.schema.createTable("categorias", (table) => {
    table.increments("id");
    table.string("nombre", 80).notNullable();
    table.enu("tipo", ["servicio", "producto"]).notNullable();
    table.timestamps(true, true);
    table.unique(["nombre", "tipo"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("categorias");
};
