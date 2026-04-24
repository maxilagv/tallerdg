exports.up = async function up(knex) {
  await knex.schema.alterTable("compras", (table) => {
    table.string("origen_tipo", 30).notNullable().defaultTo("directa").after("proveedor_id");
    table.string("origen_nombre", 150).nullable().after("origen_tipo");
    table.boolean("actualiza_stock").notNullable().defaultTo(true).after("origen_nombre");
  });

  await knex.schema.alterTable("compra_items", (table) => {
    table.string("descripcion", 255).nullable().after("producto_id");
    table.integer("producto_id").unsigned().nullable().alter();
  });

  await knex("compras")
    .whereNotNull("proveedor_id")
    .update({ origen_tipo: "proveedor" });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("compra_items", (table) => {
    table.integer("producto_id").unsigned().notNullable().alter();
    table.dropColumn("descripcion");
  });

  await knex.schema.alterTable("compras", (table) => {
    table.dropColumn("actualiza_stock");
    table.dropColumn("origen_nombre");
    table.dropColumn("origen_tipo");
  });
};
