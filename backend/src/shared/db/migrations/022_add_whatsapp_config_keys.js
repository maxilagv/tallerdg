exports.up = async function up(knex) {
  const rows = [
    {
      clave: "wsp_activo",
      valor: "1",
      descripcion: "WhatsApp activado (1=si, 0=no)",
    },
    {
      clave: "wsp_notificar_orden_cerrada",
      valor: "1",
      descripcion: "Notificar al cliente cuando el trabajo está listo",
    },
    {
      clave: "recordatorio_deuda_dias",
      valor: "7",
      descripcion: "Cada cuántos días recordar a deudores",
    },
    {
      clave: "recordatorio_deuda_monto_min",
      valor: "5000",
      descripcion: "Monto mínimo de deuda para enviar recordatorio",
    },
    {
      clave: "km_proximo_service",
      valor: "5000",
      descripcion: "Km de umbral para avisar próximo service",
    },
  ];

  for (const row of rows) {
    const existing = await knex("configuracion").where({ clave: row.clave }).first();

    if (!existing) {
      await knex("configuracion").insert({
        ...row,
        updated_at: knex.fn.now(),
      });
    }
  }
};

exports.down = async function down(knex) {
  await knex("configuracion")
    .whereIn("clave", [
      "wsp_activo",
      "wsp_notificar_orden_cerrada",
      "recordatorio_deuda_dias",
      "recordatorio_deuda_monto_min",
      "km_proximo_service",
    ])
    .del();
};
