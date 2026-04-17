exports.up = async function up(knex) {
  await knex.schema.createTable("vehiculos", (table) => {
    table.increments("id");
    table
      .integer("cliente_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("clientes");
    table.string("patente", 10).notNullable();
    table.string("patente_normalizada", 10).notNullable();
    table.string("marca", 60).notNullable();
    table.string("modelo", 60).notNullable();
    table.smallint("anio");
    table.string("color", 40);
    table
      .enu("tipo_combustible", [
        "nafta",
        "diesel",
        "gnc",
        "gnc_nafta",
        "hibrido",
        "electrico",
      ])
      .notNullable()
      .defaultTo("nafta");
    table.string("numero_motor", 50);
    table.string("numero_chasis", 50);
    table.integer("km_ultimo_service").notNullable().defaultTo(0);
    table.integer("km_ultimo_ingreso").notNullable().defaultTo(0);
    table.string("foto_url", 500);
    table.text("observaciones");
    table.specificType("activo", "tinyint(1)").notNullable().defaultTo(1);
    table.timestamps(true, true);
    table.unique(["patente_normalizada"]);
    table.index(["patente_normalizada"]);
    table.index(["cliente_id"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("vehiculos");
};
