exports.up = async function up(knex) {
  const hasMetodoPago = await knex.schema.hasColumn(
    "movimientos_cuenta_proveedor",
    "metodo_pago"
  );
  if (!hasMetodoPago) {
    await knex.schema.alterTable("movimientos_cuenta_proveedor", (t) => {
      t.string("metodo_pago", 30).notNullable().defaultTo("efectivo").after("descripcion");
      t.index(["metodo_pago"]);
    });
  }

  const hasFechaAdelanto = await knex.schema.hasColumn("adelantos_sueldo", "fecha");
  if (!hasFechaAdelanto) {
    await knex.schema.alterTable("adelantos_sueldo", (t) => {
      t.date("fecha").nullable().after("monto");
      t.index(["fecha"]);
    });

    await knex.raw("UPDATE adelantos_sueldo SET fecha = DATE(created_at) WHERE fecha IS NULL");

    await knex.schema.alterTable("adelantos_sueldo", (t) => {
      t.date("fecha").notNullable().alter();
    });
  }
};

exports.down = async function down(knex) {
  const hasFechaAdelanto = await knex.schema.hasColumn("adelantos_sueldo", "fecha");
  if (hasFechaAdelanto) {
    await knex.schema.alterTable("adelantos_sueldo", (t) => {
      t.dropIndex(["fecha"]);
      t.dropColumn("fecha");
    });
  }

  const hasMetodoPago = await knex.schema.hasColumn(
    "movimientos_cuenta_proveedor",
    "metodo_pago"
  );
  if (hasMetodoPago) {
    await knex.schema.alterTable("movimientos_cuenta_proveedor", (t) => {
      t.dropIndex(["metodo_pago"]);
      t.dropColumn("metodo_pago");
    });
  }
};
