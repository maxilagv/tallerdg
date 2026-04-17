exports.up = async function up(knex) {
  await knex.schema.createTable("ordenes_recordatorios_service", (table) => {
    table.increments("id");
    table
      .integer("orden_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("ordenes")
      .unique();
    table
      .integer("vehiculo_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("vehiculos");
    table.string("servicio", 120).notNullable();
    table.string("servicio_normalizado", 120).notNullable();
    table.date("fecha_base").notNullable();
    table.integer("km_base").notNullable();
    table.integer("km_proximo").notNullable();
    table.decimal("km_por_dia", 10, 2).notNullable();
    table.integer("dias_estimados").notNullable();
    table.date("fecha_recordatorio").notNullable();
    table.specificType("activo", "tinyint(1)").notNullable().defaultTo(1);
    table.datetime("enviado_at");
    table.timestamps(true, true);

    table.index(["vehiculo_id"]);
    table.index(["servicio_normalizado"]);
    table.index(["fecha_recordatorio"]);
    table.index(["activo"]);
  });

  const existingTemplate = await knex("wsp_templates").where({ tipo: "service_programado" }).first();
  if (!existingTemplate) {
    await knex("wsp_templates").insert({
      tipo: "service_programado",
      texto:
        "Hola {nombre}, segun el uso estimado de tu {marca} {modelo} ({patente}), ya toca el *{servicio}* alrededor de los *{km_proximo}* km. Si queres coordinar, escribinos al {telefono}.",
      activo: 1,
    });
  }
};

exports.down = async function down(knex) {
  await knex("wsp_templates").where({ tipo: "service_programado" }).del();
  await knex.schema.dropTableIfExists("ordenes_recordatorios_service");
};
