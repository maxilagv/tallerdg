exports.up = async function up(knex) {
  await knex.schema.createTable("clientes", (table) => {
    table.increments("id");
    table.string("nombre", 100).notNullable();
    table.string("apellido", 100).notNullable();
    table.string("telefono", 30);
    table.string("email", 150);
    table.string("direccion", 255);
    table.text("notas");
    table.specificType("activo", "tinyint(1)").notNullable().defaultTo(1);
    table.timestamps(true, true);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("clientes");
};
