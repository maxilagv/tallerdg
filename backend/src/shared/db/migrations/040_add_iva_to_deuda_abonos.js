exports.up = async (knex) => {
  await knex.schema.alterTable("deuda_abonos", (t) => {
    t.decimal("monto_base", 12, 2).nullable().after("monto");
    t.boolean("incluye_iva").notNullable().defaultTo(false).after("monto_base");
    t.decimal("iva_porcentaje", 5, 2).notNullable().defaultTo(0).after("incluye_iva");
    t.decimal("iva_monto", 12, 2).notNullable().defaultTo(0).after("iva_porcentaje");
  });

  await knex("deuda_abonos").update({
    monto_base: knex.raw("monto"),
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable("deuda_abonos", (t) => {
    t.dropColumn("iva_monto");
    t.dropColumn("iva_porcentaje");
    t.dropColumn("incluye_iva");
    t.dropColumn("monto_base");
  });
};
