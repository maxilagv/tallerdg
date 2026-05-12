function parsePermisos(value) {
  if (!value) {
    return {};
  }
  return typeof value === "string" ? JSON.parse(value) : value;
}

// Ampliar permisos del rol recepcionista para que pueda operar el sistema
// completo. Los movimientos manuales de caja no dependen de finanzas="rw":
// quedan mediados por el endpoint de autorizacion del titular.
exports.up = async function up(knex) {
  const role = await knex("roles").where({ nombre: "recepcionista" }).first();
  if (!role) {
    return;
  }

  const permisos = parsePermisos(role.permisos);

  permisos.clientes = "rw";
  permisos.vehiculos = "rw";
  permisos.ordenes = "rw";
  permisos.cobros = "rw";
  permisos.productos = "rw";
  permisos.servicios = "rw";
  permisos.gastos = "rw";
  permisos.finanzas = "rw";
  permisos.empleados = "rw";
  permisos.configuracion = "rw";
  permisos.whatsapp = "rw";

  await knex("roles").where({ id: role.id }).update({
    permisos: JSON.stringify(permisos),
    updated_at: knex.fn.now(),
  });
};

exports.down = async function down(knex) {
  const role = await knex("roles").where({ nombre: "recepcionista" }).first();
  if (!role) {
    return;
  }

  await knex("roles").where({ id: role.id }).update({
    permisos: JSON.stringify({
      clientes: "rw",
      vehiculos: "rw",
      ordenes: "r",
      cobros: "rw",
    }),
    updated_at: knex.fn.now(),
  });
};
