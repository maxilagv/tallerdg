function parsePermisos(value) {
  if (!value) {
    return {};
  }

  return typeof value === "string" ? JSON.parse(value) : value;
}

exports.up = async function up(knex) {
  const roles = await knex("roles").select("id", "nombre", "permisos");

  for (const role of roles) {
    if (role.nombre === "admin") {
      continue;
    }

    const permisos = parsePermisos(role.permisos);

    if (role.nombre === "recepcionista" && !permisos.cobros) {
      permisos.cobros = "rw";
    }

    await knex("roles").where({ id: role.id }).update({
      permisos: JSON.stringify(permisos),
      updated_at: knex.fn.now(),
    });
  }
};

exports.down = async function down(knex) {
  const roles = await knex("roles").select("id", "nombre", "permisos");

  for (const role of roles) {
    if (role.nombre === "admin") {
      continue;
    }

    const permisos = parsePermisos(role.permisos);

    if (!Object.prototype.hasOwnProperty.call(permisos, "cobros")) {
      continue;
    }

    delete permisos.cobros;

    await knex("roles").where({ id: role.id }).update({
      permisos: JSON.stringify(permisos),
      updated_at: knex.fn.now(),
    });
  }
};
