exports.up = async (knex) => {
  await knex.schema.createTable("compras", (t) => {
    t.increments("id");
    t.integer("proveedor_id").unsigned().references("id").inTable("proveedores").nullable();
    t.decimal("total", 12, 2).notNullable().defaultTo(0);
    t.date("fecha").notNullable();
    t.text("notas");
    t.integer("empleado_id").unsigned().references("id").inTable("empleados").nullable();
    t.timestamps(true, true);
    t.index("fecha");
    t.index("proveedor_id");
  });

  await knex.schema.createTable("compra_items", (t) => {
    t.increments("id");
    t.integer("compra_id").unsigned().notNullable().references("id").inTable("compras").onDelete("CASCADE");
    t.integer("producto_id").unsigned().notNullable().references("id").inTable("productos");
    t.decimal("cantidad", 8, 2).notNullable().defaultTo(1);
    t.decimal("precio_unitario", 12, 2).notNullable().defaultTo(0);
    t.decimal("subtotal", 12, 2).notNullable().defaultTo(0);
    t.index("compra_id");
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists("compra_items");
  await knex.schema.dropTableIfExists("compras");
};
