exports.up = async function up(knex) {
  const hasAnuladoAt = await knex.schema.hasColumn("adelantos_sueldo", "anulado_at");
  if (!hasAnuladoAt) {
    await knex.schema.alterTable("adelantos_sueldo", (t) => {
      t.timestamp("anulado_at").nullable().after("registrado_por_empleado_id");
      t.integer("anulado_por_empleado_id").unsigned().nullable().after("anulado_at");
      t.string("motivo_anulacion", 500).nullable().after("anulado_por_empleado_id");
      t.index(["anulado_at"]);
    });
  }
};

exports.down = async function down(knex) {
  const hasAnuladoAt = await knex.schema.hasColumn("adelantos_sueldo", "anulado_at");
  if (hasAnuladoAt) {
    await knex.schema.alterTable("adelantos_sueldo", (t) => {
      t.dropIndex(["anulado_at"]);
      t.dropColumn("motivo_anulacion");
      t.dropColumn("anulado_por_empleado_id");
      t.dropColumn("anulado_at");
    });
  }
};
