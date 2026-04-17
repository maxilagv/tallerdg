exports.up = async function up(knex) {
  await knex.schema.createTable("gastos", (table) => {
    table.increments("id");
    table
      .integer("categoria_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("categorias_gastos");
    table.string("descripcion", 255).notNullable();
    table.decimal("monto", 12, 2).notNullable();
    table.date("fecha").notNullable();
    table
      .integer("empleado_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("empleados");
    table
      .integer("referencia_empleado_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("empleados");
    table.string("adjunto_url", 500);
    table.text("notas");
    table.specificType("activo", "tinyint(1)").notNullable().defaultTo(1);
    table.timestamps(true, true);
    table.index(["fecha"]);
    table.index(["categoria_id"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("gastos");
};
