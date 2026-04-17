exports.up = async function up(knex) {
  await knex.schema.createTable("servicios", (table) => {
    table.increments("id");
    table
      .integer("categoria_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("categorias");
    table.string("nombre", 150).notNullable();
    table.text("descripcion");
    table.decimal("precio_base", 12, 2).notNullable().defaultTo(0);
    table.smallint("tiempo_estimado_min").notNullable().defaultTo(0);
    table.specificType("activo", "tinyint(1)").notNullable().defaultTo(1);
    table.timestamps(true, true);
    table.index(["categoria_id"]);
    table.index(["nombre"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("servicios");
};
