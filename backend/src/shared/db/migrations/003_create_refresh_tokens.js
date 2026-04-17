exports.up = async function up(knex) {
  await knex.schema.createTable("refresh_tokens", (table) => {
    table.increments("id");
    table
      .integer("empleado_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("empleados");
    table.string("token_hash", 64).notNullable();
    table.datetime("expires_at").notNullable();
    table.specificType("revocado", "tinyint(1)").notNullable().defaultTo(0);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.index(["token_hash"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("refresh_tokens");
};
