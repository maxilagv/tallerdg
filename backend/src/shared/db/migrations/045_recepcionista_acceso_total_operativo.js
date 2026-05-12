function parsePermisos(value) {
  if (!value) {
    return {};
  }
  return typeof value === "string" ? JSON.parse(value) : value;
}

exports.up = async function up(knex) {
  const role = await knex("roles").where({ nombre: "recepcionista" }).first();
  if (!role) {
    return;
  }

  const permisos = parsePermisos(role.permisos);
  const permisosOperativos = {
    clientes: "rw",
    vehiculos: "rw",
    ordenes: "rw",
    cobros: "rw",
    productos: "rw",
    servicios: "rw",
    gastos: "rw",
    finanzas: "rw",
    empleados: "rw",
    configuracion: "rw",
    whatsapp: "rw",
  };

  await knex("roles").where({ id: role.id }).update({
    permisos: JSON.stringify({ ...permisos, ...permisosOperativos }),
    updated_at: knex.fn.now(),
  });
};

exports.down = async function down(knex) {
  const role = await knex("roles").where({ nombre: "recepcionista" }).first();
  if (!role) {
    return;
  }

  const permisos = parsePermisos(role.permisos);
  delete permisos.empleados;
  delete permisos.configuracion;
  delete permisos.whatsapp;
  permisos.finanzas = "r";

  await knex("roles").where({ id: role.id }).update({
    permisos: JSON.stringify(permisos),
    updated_at: knex.fn.now(),
  });
};
