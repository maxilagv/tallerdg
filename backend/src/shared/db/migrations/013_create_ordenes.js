exports.up = async function up(knex) {
  await knex.schema.createTable("ordenes", (table) => {
    table.increments("id");
    table.string("numero", 20).unique().nullable();
    table
      .integer("cliente_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("clientes");
    table
      .integer("vehiculo_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("vehiculos");
    table
      .integer("empleado_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("empleados");
    table.integer("km_entrada").notNullable().defaultTo(0);
    table
      .enu("estado", ["abierta", "en_proceso", "lista", "cerrada", "cancelada"])
      .notNullable()
      .defaultTo("abierta");
    table.decimal("subtotal", 12, 2).notNullable().defaultTo(0);
    table.decimal("descuento", 12, 2).notNullable().defaultTo(0);
    table.decimal("total", 12, 2).notNullable().defaultTo(0);
    table.text("notas_cliente");
    table.text("notas_mecanico");
    table.timestamps(true, true);
    table.datetime("closed_at").nullable();
    table.index(["estado"]);
    table.index(["cliente_id"]);
    table.index(["vehiculo_id"]);
    table.index(["created_at"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("ordenes");
};
