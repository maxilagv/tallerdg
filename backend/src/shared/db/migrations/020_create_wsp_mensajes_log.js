exports.up = function up(knex) {
  return knex.schema.createTable("wsp_mensajes_log", (table) => {
    table.increments("id");
    table.string("destinatario", 30).notNullable();
    table.string("tipo", 50).notNullable();
    table.text("contenido").notNullable();
    table.enu("estado", ["pendiente", "enviado", "fallido"]).notNullable().defaultTo("pendiente");
    table.text("error_detalle");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.datetime("enviado_at");
    table.index("estado");
    table.index("created_at");
  });
};

exports.down = function down(knex) {
  return knex.schema.dropTable("wsp_mensajes_log");
};
