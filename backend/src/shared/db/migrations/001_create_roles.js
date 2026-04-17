exports.up = async function up(knex) {
  await knex.schema.createTable("roles", (table) => {
    table.increments("id");
    table.string("nombre", 50).notNullable();
    table.json("permisos").notNullable();
    table.timestamps(true, true);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("roles");
};
