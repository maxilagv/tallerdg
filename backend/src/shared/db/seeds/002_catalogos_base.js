exports.seed = async function seed(knex) {
  await knex("movimientos_stock").del();
  await knex("productos").del();
  await knex("servicios").del();
  await knex("proveedores").del();
  await knex("categorias").del();

  await knex("categorias").insert([
    { nombre: "Mecanica general", tipo: "servicio" },
    { nombre: "Aire acondicionado", tipo: "servicio" },
    { nombre: "GNC", tipo: "servicio" },
    { nombre: "Lubricentro", tipo: "servicio" },
    { nombre: "Inyeccion electronica", tipo: "servicio" },
    { nombre: "Suspension y direccion", tipo: "servicio" },
    { nombre: "Frenos", tipo: "servicio" },
    { nombre: "Lubricantes y aceites", tipo: "producto" },
    { nombre: "Filtros", tipo: "producto" },
    { nombre: "Frenos y pastillas", tipo: "producto" },
    { nombre: "Repuestos GNC", tipo: "producto" },
    { nombre: "Repuestos A/C", tipo: "producto" },
    { nombre: "Electricidad", tipo: "producto" },
    { nombre: "Correas y cadenas", tipo: "producto" },
    { nombre: "Varios", tipo: "producto" },
  ]);
};
