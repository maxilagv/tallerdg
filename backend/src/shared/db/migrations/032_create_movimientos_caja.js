/**
 * Migration 032 — Movimientos de Caja del Titular
 * ------------------------------------------------
 * Crea la tabla `movimientos_caja` para registrar aportes y retiros que
 * el dueño del taller hace de la caja, INDEPENDIENTES del resultado
 * operativo del negocio.
 *
 * Conceptos clave:
 *  - aporte_titular : el dueño inyecta dinero (paga algo de su bolsillo,
 *                     repone efectivo, etc.). No es ingreso del negocio.
 *  - retiro_titular : el dueño saca dinero de la caja (uso personal,
 *                     paga una deuda fuera del sistema, etc.). No es gasto.
 *
 * Esto permite calcular el SALDO REAL DE CAJA:
 *   Saldo Real = Resultado Operativo + Aportes Titular − Retiros Titular
 *
 * El resultado operativo no se altera. Los movimientos se muestran en el
 * historial para total transparencia, diferenciados visualmente.
 */
exports.up = async (knex) => {
  await knex.schema.createTable("movimientos_caja", (t) => {
    t.increments("id");

    // Tipo de movimiento (expandible en el futuro con más variantes)
    t.enu("tipo", ["aporte_titular", "retiro_titular"])
      .notNullable()
      .comment("aporte_titular = el dueño mete plata · retiro_titular = el dueño saca plata");

    t.decimal("monto", 12, 2).notNullable();

    // Descripción breve y obligatoria ("Pago de alquiler de mi cuenta")
    t.string("concepto", 255).notNullable();

    // Referencia externa opcional (nro de transferencia, nro de recibo, etc.)
    t.string("referencia", 255).nullable();

    t.date("fecha").notNullable();

    // Quién registró el movimiento
    t.integer("empleado_id").unsigned().nullable()
      .references("id").inTable("empleados");

    t.text("notas").nullable();

    // Soft delete: activo = 0 oculta el registro sin borrarlo de la BD
    t.specificType("activo", "tinyint(1)").notNullable().defaultTo(1);

    t.timestamps(true, true);

    t.index(["fecha"]);
    t.index(["tipo"]);
    t.index(["activo"]);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists("movimientos_caja");
};
