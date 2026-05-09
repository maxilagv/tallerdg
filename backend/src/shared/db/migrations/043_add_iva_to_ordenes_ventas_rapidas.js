exports.up = async (knex) => {
  await knex.schema.alterTable("ordenes", (t) => {
    t.decimal("iva_porcentaje", 5, 2).notNullable().defaultTo(0).after("descuento");
    t.decimal("iva_monto", 12, 2).notNullable().defaultTo(0).after("iva_porcentaje");
  });

  await knex.schema.alterTable("ventas_rapidas", (t) => {
    t.decimal("iva_porcentaje", 5, 2).notNullable().defaultTo(0).after("fecha");
    t.decimal("iva_monto", 12, 2).notNullable().defaultTo(0).after("iva_porcentaje");
  });

  const existing = await knex("configuracion").where({ clave: "iva_porcentaje_default" }).first();
  if (!existing) {
    await knex("configuracion").insert({
      clave: "iva_porcentaje_default",
      valor: "21",
      descripcion: "Porcentaje de IVA sugerido por defecto",
    });
  }
};

exports.down = async (knex) => {
  await knex.schema.alterTable("ventas_rapidas", (t) => {
    t.dropColumn("iva_monto");
    t.dropColumn("iva_porcentaje");
  });

  await knex.schema.alterTable("ordenes", (t) => {
    t.dropColumn("iva_monto");
    t.dropColumn("iva_porcentaje");
  });

  await knex("configuracion").where({ clave: "iva_porcentaje_default" }).del();
};
