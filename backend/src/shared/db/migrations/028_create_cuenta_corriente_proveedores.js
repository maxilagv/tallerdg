exports.up = async (knex) => {
  await knex.schema.createTable("cuentas_corrientes_proveedores", (t) => {
    t.increments("id");
    t.integer("proveedor_id")
      .unsigned()
      .notNullable()
      .unique()
      .references("id")
      .inTable("proveedores")
      .onDelete("CASCADE");
    t.boolean("activa").notNullable().defaultTo(true);
    // saldo = cuánto le debemos al proveedor (positivo = deuda nuestra)
    t.decimal("saldo", 12, 2).notNullable().defaultTo(0);
    t.timestamps(true, true);
  });

  await knex.schema.createTable("movimientos_cuenta_proveedor", (t) => {
    t.increments("id");
    t.integer("proveedor_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("proveedores")
      .onDelete("CASCADE");
    t.enu("tipo", ["deuda", "pago", "ajuste"]).notNullable();
    t.decimal("monto", 12, 2).notNullable(); // siempre positivo
    t.text("descripcion").notNullable();
    t.integer("compra_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("compras");
    t.integer("empleado_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("empleados");
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.index("proveedor_id");
    t.index("tipo");
    t.index("created_at");
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists("movimientos_cuenta_proveedor");
  await knex.schema.dropTableIfExists("cuentas_corrientes_proveedores");
};
