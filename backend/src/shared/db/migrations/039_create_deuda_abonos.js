exports.up = async (knex) => {
  await knex.schema.createTable("deuda_abonos", (t) => {
    t.increments("id");
    t.integer("deuda_id").unsigned().notNullable().references("id").inTable("deudas");
    t.decimal("monto", 12, 2).notNullable();
    t.string("metodo_pago", 30).notNullable().defaultTo("efectivo");
    t.text("notas").nullable();
    t.integer("empleado_id").unsigned().nullable().references("id").inTable("empleados");
    t.datetime("created_at").notNullable().defaultTo(knex.fn.now());

    t.index("deuda_id");
    t.index("metodo_pago");
    t.index("created_at");
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists("deuda_abonos");
};
