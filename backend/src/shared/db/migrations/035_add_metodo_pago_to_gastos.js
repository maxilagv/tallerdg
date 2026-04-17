exports.up = async function up(knex) {
  await knex.schema.alterTable("gastos", (table) => {
    table
      .enu("metodo_pago", [
        "efectivo",
        "transferencia",
        "tarjeta_debito",
        "tarjeta_credito",
        "cheque",
      ])
      .nullable()
      .after("monto");

    table.index(["metodo_pago"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("gastos", (table) => {
    table.dropIndex(["metodo_pago"]);
    table.dropColumn("metodo_pago");
  });
};
