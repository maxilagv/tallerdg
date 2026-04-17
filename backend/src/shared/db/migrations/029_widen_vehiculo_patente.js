exports.up = async (knex) => {
  await knex.schema.alterTable("vehiculos", (table) => {
    table.string("patente", 30).notNullable().alter();
    table.string("patente_normalizada", 30).notNullable().alter();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable("vehiculos", (table) => {
    table.string("patente", 10).notNullable().alter();
    table.string("patente_normalizada", 10).notNullable().alter();
  });
};
