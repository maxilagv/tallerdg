exports.up = async function up(knex) {
  await knex.raw(
    `
      INSERT IGNORE INTO configuracion (clave, valor, descripcion)
      VALUES (?, ?, ?)
    `,
    [
      "recordatorio_deuda_auto",
      "0",
      "Enviar recordatorios de deuda automaticamente desde cron (1=si, 0=no).",
    ]
  );
};

exports.down = async function down(knex) {
  await knex("configuracion").where({ clave: "recordatorio_deuda_auto" }).delete();
};
