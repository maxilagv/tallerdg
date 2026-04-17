exports.up = async function up(knex) {
  await knex.schema.createTable("orden_servicios", (table) => {
    table.increments("id");
    table
      .integer("orden_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("ordenes")
      .onDelete("CASCADE");
    table
      .integer("servicio_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("servicios");
    table.string("descripcion", 255);
    table.integer("cantidad").notNullable().defaultTo(1);
    table.decimal("precio_unitario", 12, 2).notNullable();
    table.decimal("subtotal", 12, 2).notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.index(["orden_id"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("orden_servicios");
};
