exports.up = async function up(knex) {
  const existing = await knex("configuracion").where({ clave: "stock_minimo_default" }).first();

  if (!existing) {
    await knex("configuracion").insert({
      clave: "stock_minimo_default",
      valor: "5",
      descripcion: "Stock mínimo predeterminado para nuevos productos e importaciones",
      updated_at: knex.fn.now(),
    });
  }
};

exports.down = async function down(knex) {
  await knex("configuracion").where({ clave: "stock_minimo_default" }).del();
};
