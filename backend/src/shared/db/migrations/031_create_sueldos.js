exports.up = async (knex) => {
  // ── Configuración de sueldo por empleado ──────────────────────────────────
  await knex.schema.createTable("empleado_salario_config", (t) => {
    t.increments("id");
    t.integer("empleado_id").unsigned().notNullable().unique()
      .references("id").inTable("empleados").onDelete("CASCADE");
    t.decimal("sueldo_base", 12, 2).notNullable().defaultTo(0);
    t.enu("periodo_pago", ["semana", "quincena", "mes"]).notNullable().defaultTo("mes");
    t.timestamps(true, true);
  });

  // ── Períodos de liquidación ───────────────────────────────────────────────
  await knex.schema.createTable("periodos_sueldo", (t) => {
    t.increments("id");
    t.integer("empleado_id").unsigned().notNullable()
      .references("id").inTable("empleados").onDelete("CASCADE");
    t.date("fecha_inicio").notNullable();
    t.date("fecha_fin").notNullable();
    t.decimal("sueldo_base", 12, 2).notNullable(); // snapshot al abrir
    t.enu("estado", ["abierto", "pagado"]).notNullable().defaultTo("abierto");
    t.timestamp("pagado_at").nullable();
    t.integer("pagado_por_empleado_id").unsigned().nullable()
      .references("id").inTable("empleados");
    t.integer("gasto_liquidacion_id").unsigned().nullable(); // FK a gastos (no constraint para evitar circular)
    t.timestamps(true, true);
    t.index(["empleado_id", "estado"]);
    t.index("fecha_fin");
  });

  // ── Adelantos ─────────────────────────────────────────────────────────────
  await knex.schema.createTable("adelantos_sueldo", (t) => {
    t.increments("id");
    t.integer("periodo_id").unsigned().notNullable()
      .references("id").inTable("periodos_sueldo").onDelete("CASCADE");
    t.integer("empleado_id").unsigned().notNullable()
      .references("id").inTable("empleados");
    t.decimal("monto", 12, 2).notNullable();
    t.string("descripcion", 300).nullable();
    t.integer("gasto_id").unsigned().nullable(); // FK a gastos (no constraint para evitar circular)
    t.integer("registrado_por_empleado_id").unsigned().nullable()
      .references("id").inTable("empleados");
    t.timestamps(true, true);
    t.index(["periodo_id"]);
    t.index(["empleado_id"]);
  });

  // ── Categoría "Sueldos" en gastos (si no existe) ─────────────────────────
  const existente = await knex("categorias_gastos").where("nombre", "Sueldos").first();
  if (!existente) {
    await knex("categorias_gastos").insert({ nombre: "Sueldos" });
  }
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists("adelantos_sueldo");
  await knex.schema.dropTableIfExists("periodos_sueldo");
  await knex.schema.dropTableIfExists("empleado_salario_config");
};
