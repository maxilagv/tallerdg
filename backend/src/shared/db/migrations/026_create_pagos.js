exports.up = async function up(knex) {
  await knex.schema.createTable("pagos", (table) => {
    table.increments("id");
    table
      .integer("orden_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("ordenes");
    table.decimal("monto", 12, 2).notNullable();
    table
      .enu("metodo", [
        "efectivo",
        "transferencia",
        "tarjeta_debito",
        "tarjeta_credito",
        "cheque",
      ])
      .notNullable();
    table.string("referencia", 255);
    table.text("notas");
    table
      .integer("empleado_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("empleados");
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.datetime("anulado_at").nullable();
    table
      .integer("anulado_por")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("empleados");
    table.string("motivo_anulacion", 255).nullable();

    table.index(["orden_id"]);
    table.index(["metodo"]);
    table.index(["created_at"]);
    table.index(["anulado_at"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("pagos");
};
