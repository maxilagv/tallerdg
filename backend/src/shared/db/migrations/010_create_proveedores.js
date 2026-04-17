exports.up = async function up(knex) {
  await knex.schema.createTable("proveedores", (table) => {
    table.increments("id");
    table.string("nombre", 150).notNullable();
    table.string("cuit", 20);
    table.string("telefono", 30);
    table.string("email", 150);
    table.string("condicion_pago", 100);
    table.text("notas");
    table.specificType("activo", "tinyint(1)").notNullable().defaultTo(1);
    table.timestamps(true, true);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("proveedores");
};
