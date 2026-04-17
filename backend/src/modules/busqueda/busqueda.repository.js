const db = require("../../shared/db/knex");

const BusquedaRepository = {
  async buscarClientes(q, limit = 5) {
    return db("clientes")
      .where("activo", 1)
      .andWhere(function applySearch() {
        this.where("nombre", "like", `%${q}%`)
          .orWhere("apellido", "like", `%${q}%`)
          .orWhere("telefono", "like", `%${q}%`);
      })
      .orderBy("apellido", "asc")
      .limit(limit)
      .select("id", "nombre", "apellido", "telefono");
  },

  async buscarVehiculos(q, limit = 5) {
    const patenteNormalizada = q.replace(/\s+/g, "").toUpperCase();

    return db("vehiculos as v")
      .join("clientes as c", "v.cliente_id", "c.id")
      .where("v.activo", 1)
      .where("c.activo", 1)
      .andWhere(function applySearch() {
        this.where("v.patente_normalizada", "like", `%${patenteNormalizada}%`)
          .orWhere("v.marca", "like", `%${q}%`)
          .orWhere("v.modelo", "like", `%${q}%`)
          .orWhere("c.nombre", "like", `%${q}%`)
          .orWhere("c.apellido", "like", `%${q}%`);
      })
      .orderBy("v.created_at", "desc")
      .limit(limit)
      .select(
        "v.id",
        "v.patente",
        "v.marca",
        "v.modelo",
        "v.anio",
        "c.id as cliente_id",
        db.raw("CONCAT(c.apellido, ', ', c.nombre) as cliente_nombre")
      );
  },

  async buscarOrdenes(q, limit = 5) {
    const patenteNormalizada = q.replace(/\s+/g, "").toUpperCase();

    return db("ordenes as o")
      .join("clientes as c", "o.cliente_id", "c.id")
      .join("vehiculos as v", "o.vehiculo_id", "v.id")
      .whereIn("o.estado", ["abierta", "en_proceso", "lista"])
      .andWhere(function applySearch() {
        this.where("o.numero", "like", `%${q}%`)
          .orWhere("v.patente_normalizada", "like", `%${patenteNormalizada}%`)
          .orWhere("c.nombre", "like", `%${q}%`)
          .orWhere("c.apellido", "like", `%${q}%`);
      })
      .orderBy("o.created_at", "desc")
      .limit(limit)
      .select(
        "o.id",
        "o.numero",
        "o.estado",
        "v.patente",
        db.raw("CONCAT(c.apellido, ', ', c.nombre) as cliente_nombre")
      );
  },
};

module.exports = BusquedaRepository;
