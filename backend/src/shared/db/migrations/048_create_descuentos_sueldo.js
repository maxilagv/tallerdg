exports.up = async (knex) => {
  await knex.schema.createTable("descuentos_sueldo", (t) => {
    t.increments("id");
    t.integer("periodo_id").unsigned().notNullable()
      .references("id").inTable("periodos_sueldo").onDelete("CASCADE");
    t.integer("empleado_id").unsigned().notNullable()
      .references("id").inTable("empleados");
    t.enu("tipo", ["falta", "tardanza"]).notNullable();
    t.date("fecha").notNullable();
    t.decimal("cantidad", 10, 2).notNullable();
    t.decimal("horas_jornada", 10, 2).nullable();
    t.decimal("valor_dia", 12, 2).notNullable();
    t.decimal("valor_hora", 12, 2).nullable();
    t.decimal("monto", 12, 2).notNullable();
    t.string("motivo", 500).nullable();
    t.integer("registrado_por_empleado_id").unsigned().nullable()
      .references("id").inTable("empleados");
    t.timestamp("anulado_at").nullable();
    t.integer("anulado_por_empleado_id").unsigned().nullable()
      .references("id").inTable("empleados");
    t.string("motivo_anulacion", 500).nullable();
    t.timestamps(true, true);
    t.index(["periodo_id"]);
    t.index(["empleado_id"]);
    t.index(["tipo"]);
    t.index(["anulado_at"]);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists("descuentos_sueldo");
};
