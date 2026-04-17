exports.up = async function up(knex) {
  await knex.schema.createTable("wsp_templates", (table) => {
    table.increments("id");
    table.string("tipo", 50).notNullable().unique();
    table.text("texto").notNullable();
    table.tinyint("activo").defaultTo(1);
    table.timestamps(true, true);
  });

  await knex("wsp_templates").insert([
    {
      tipo: "orden_cerrada",
      texto:
        "¡Hola {nombre}! Tu vehículo *{patente}* ya está listo para retirar. El trabajo realizado fue: {servicios}. Total: *{total}*. ¡Gracias por confiar en nosotros!",
    },
    {
      tipo: "recordatorio_deuda",
      texto:
        "Hola {nombre}, te recordamos que tenés un saldo pendiente de *{monto}* con {taller}. Cuando puedas, contactanos para coordinar el pago. ¡Gracias!",
    },
    {
      tipo: "proximo_service",
      texto:
        "Hola {nombre}, notamos que tu {marca} {modelo} ({patente}) está próximo a los *{km_proximo}* km. Es el momento ideal para el próximo service. Llamanos al {telefono} para coordinar.",
    },
  ]);
};

exports.down = async function down(knex) {
  await knex.schema.dropTable("wsp_templates");
};
