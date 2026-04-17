exports.up = async function up(knex) {
  await knex.schema.createTable("movimientos_stock", (table) => {
    table.increments("id");
    table
      .integer("producto_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("productos");
    table.enu("tipo", ["entrada", "salida", "ajuste"]).notNullable();
    table.decimal("cantidad", 10, 2).notNullable();
    table.decimal("stock_anterior", 10, 2).notNullable();
    table.decimal("stock_nuevo", 10, 2).notNullable();
    table.string("referencia_tipo", 30);
    table.integer("referencia_id");
    table
      .integer("empleado_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("empleados");
    table.text("notas");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.index(["producto_id", "created_at"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("movimientos_stock");
};
