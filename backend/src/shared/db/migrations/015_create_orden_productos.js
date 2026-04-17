exports.up = async function up(knex) {
  await knex.schema.createTable("orden_productos", (table) => {
    table.increments("id");
    table
      .integer("orden_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("ordenes")
      .onDelete("CASCADE");
    table
      .integer("producto_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("productos");
    table.string("descripcion", 255);
    table.decimal("cantidad", 10, 2).notNullable().defaultTo(1);
    table.decimal("precio_unitario", 12, 2).notNullable();
    table.decimal("subtotal", 12, 2).notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.index(["orden_id"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("orden_productos");
};
