exports.up = async function up(knex) {
  await knex.schema.alterTable("ordenes", (table) => {
    table
      .enu("estado_pago", ["sin_pagar", "pago_parcial", "pagado"])
      .notNullable()
      .defaultTo("sin_pagar")
      .after("estado");
    table.index(["estado_pago"]);
  });

  await knex("ordenes").where("total", "<=", 0).update({
    estado_pago: "pagado",
    updated_at: knex.fn.now(),
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("ordenes", (table) => {
    table.dropIndex(["estado_pago"]);
    table.dropColumn("estado_pago");
  });
};
