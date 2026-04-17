exports.up = async function up(knex) {
  await knex.schema.createTable("productos", (table) => {
    table.increments("id");
    table
      .integer("categoria_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("categorias");
    table
      .integer("proveedor_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("proveedores");
    table.string("nombre", 150).notNullable();
    table.string("codigo", 60);
    table.string("marca", 80);
    table.text("descripcion");
    table.decimal("precio_costo", 12, 2).notNullable().defaultTo(0);
    table.decimal("precio_venta", 12, 2).notNullable().defaultTo(0);
    table.decimal("stock_actual", 10, 2).notNullable().defaultTo(0);
    table.decimal("stock_minimo", 10, 2).notNullable().defaultTo(0);
    table.string("unidad", 30).notNullable().defaultTo("unidad");
    table.specificType("activo", "tinyint(1)").notNullable().defaultTo(1);
    table.timestamps(true, true);
    table.index(["categoria_id"]);
    table.index(["proveedor_id"]);
    table.index(["stock_actual", "stock_minimo"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("productos");
};
