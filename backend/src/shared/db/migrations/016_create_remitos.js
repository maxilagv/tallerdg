exports.up = async function up(knex) {
  await knex.schema.createTable("remitos", (table) => {
    table.increments("id");
    table
      .integer("orden_id")
      .unsigned()
      .notNullable()
      .unique()
      .references("id")
      .inTable("ordenes");
    table.string("numero", 20).notNullable().unique();
    table.string("pdf_url", 500);
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("remitos");
};
