/**
 * Migration 033 — Adelanto al ingreso de la orden
 * -------------------------------------------------
 * Agrega `adelanto` a la tabla `ordenes` para registrar cuánto pagó
 * el cliente al momento de dejar el vehículo.
 *
 * El adelanto se guarda en `ordenes.adelanto` como referencia informativa,
 * y también se registra automáticamente como un pago en `pagos` (con
 * notas = 'Adelanto al ingreso') al crear la orden.
 */
exports.up = async (knex) => {
  await knex.schema.alterTable("ordenes", (t) => {
    t.decimal("adelanto", 12, 2).notNullable().defaultTo(0).after("descuento");
    t.string("adelanto_metodo", 50).nullable().after("adelanto");
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable("ordenes", (t) => {
    t.dropColumn("adelanto_metodo");
    t.dropColumn("adelanto");
  });
};
