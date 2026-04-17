exports.up = async function up(knex) {
  await knex.schema.createTable("empleados", (table) => {
    table.increments("id");
    table.integer("rol_id").unsigned().notNullable().references("id").inTable("roles");
    table.string("nombre", 100).notNullable();
    table.string("apellido", 100).notNullable();
    table.string("telefono", 30);
    table.string("email", 150).unique();
    table.string("password_hash", 255).notNullable();
    table.specificType("activo", "tinyint(1)").notNullable().defaultTo(1);
    table.timestamps(true, true);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("empleados");
};
