exports.up = async function up(knex) {
  await knex.schema.alterTable("movimientos_caja", (t) => {
    t.enu("metodo_pago", ["efectivo", "transferencia"])
      .notNullable()
      .defaultTo("efectivo")
      .after("monto");
    t.index(["metodo_pago"]);
  });

  await knex.schema.createTable("owner_authorization_requests", (t) => {
    t.increments("id");
    t.integer("solicitante_empleado_id").unsigned().notNullable()
      .references("id").inTable("empleados");
    t.integer("admin_empleado_id").unsigned().nullable()
      .references("id").inTable("empleados");
    t.string("scope", 80).notNullable();
    t.string("accion", 80).notNullable();
    t.text("payload_json").notNullable();
    t.enu("estado", ["pending", "approved", "used", "rejected", "expired"])
      .notNullable()
      .defaultTo("pending");
    t.string("code_hash", 64).nullable();
    t.dateTime("code_expires_at").nullable();
    t.dateTime("approved_at").nullable();
    t.dateTime("used_at").nullable();
    t.dateTime("rejected_at").nullable();
    t.string("reject_reason", 255).nullable();
    t.timestamps(true, true);

    t.index(["estado", "created_at"]);
    t.index(["scope"]);
    t.index(["code_hash"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("owner_authorization_requests");
  await knex.schema.alterTable("movimientos_caja", (t) => {
    t.dropIndex(["metodo_pago"]);
    t.dropColumn("metodo_pago");
  });
};
