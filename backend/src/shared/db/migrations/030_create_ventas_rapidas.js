exports.up = async (knex) => {
  await knex.schema.createTable("ventas_rapidas", (t) => {
    t.increments("id");
    t.date("fecha").notNullable();
    t.decimal("total", 12, 2).notNullable().defaultTo(0);
    t.string("medio_pago", 30).notNullable().defaultTo("efectivo");
    t.text("notas").nullable();
    t.integer("empleado_id").unsigned().nullable().references("id").inTable("empleados");
    t.timestamps(true, true);
    t.index("fecha");
    t.index("created_at");
  });

  await knex.schema.createTable("venta_rapida_items", (t) => {
    t.increments("id");
    t.integer("venta_id").unsigned().notNullable()
      .references("id").inTable("ventas_rapidas").onDelete("CASCADE");
    t.integer("producto_id").unsigned().nullable().references("id").inTable("productos");
    t.string("producto_nombre", 200).notNullable();
    t.string("unidad", 50).notNullable().defaultTo("unidad");
    t.decimal("cantidad", 10, 3).notNullable().defaultTo(1);
    t.decimal("precio_unitario", 12, 2).notNullable().defaultTo(0);
    t.decimal("subtotal", 12, 2).notNullable().defaultTo(0);
    t.index("venta_id");
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists("venta_rapida_items");
  await knex.schema.dropTableIfExists("ventas_rapidas");
};
