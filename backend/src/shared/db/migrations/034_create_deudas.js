/**
 * Migration 034 — Deudas de clientes
 * ------------------------------------
 * Tabla para registrar deudas manuales de clientes:
 *  - Deudas anteriores al sistema (migración de deudas viejas)
 *  - Deudas que no provienen de una orden de trabajo
 *
 * Las deudas de órdenes ya están cubiertas por el módulo de pagos
 * (saldo_pendiente = orden.total - sum(pagos activos)).
 *
 * Estado:
 *   pendiente → se debe todo
 *   parcial   → se abonó algo pero no todo
 *   pagada    → monto_pagado >= monto_original
 */
exports.up = async (knex) => {
  await knex.schema.createTable("deudas", (t) => {
    t.increments("id");

    t.integer("cliente_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("clientes");

    t.string("concepto", 255).notNullable();

    t.decimal("monto_original", 12, 2).notNullable();

    t.decimal("monto_pagado", 12, 2).notNullable().defaultTo(0);

    t.date("fecha").notNullable();

    t.enu("estado", ["pendiente", "parcial", "pagada"])
      .notNullable()
      .defaultTo("pendiente");

    t.text("notas").nullable();

    t.integer("empleado_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("empleados");

    t.specificType("activo", "tinyint(1)").notNullable().defaultTo(1);

    t.timestamps(true, true);

    t.index(["cliente_id"]);
    t.index(["estado"]);
    t.index(["activo"]);
    t.index(["fecha"]);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists("deudas");
};
