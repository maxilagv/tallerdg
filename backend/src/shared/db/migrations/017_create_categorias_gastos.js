exports.up = async function up(knex) {
  await knex.schema.createTable("categorias_gastos", (table) => {
    table.increments("id");
    table.string("nombre", 80).notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex("categorias_gastos").insert([
    { nombre: "Sueldo empleado" },
    { nombre: "Alquiler" },
    { nombre: "Servicios (luz, gas, agua)" },
    { nombre: "Insumos taller" },
    { nombre: "Herramientas" },
    { nombre: "Impuestos" },
    { nombre: "Gasto extraordinario" },
    { nombre: "Otros" },
  ]);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("categorias_gastos");
};
