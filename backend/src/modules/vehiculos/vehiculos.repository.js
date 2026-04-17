const db = require("../../shared/db/knex");

const VehiculosRepository = {
  async findAll({ page = 1, limit = 20, q } = {}) {
    const offset = (page - 1) * limit;
    const query = db("vehiculos as v")
      .join("clientes as c", "v.cliente_id", "c.id")
      .where("v.activo", 1)
      .where("c.activo", 1);

    if (q) {
      const patenteNormalizada = q.replace(/\s+/g, "").toUpperCase();

      query.andWhere(function applySearch() {
        this.where("v.patente_normalizada", "like", `%${patenteNormalizada}%`)
          .orWhere("v.marca", "like", `%${q}%`)
          .orWhere("v.modelo", "like", `%${q}%`)
          .orWhere("c.nombre", "like", `%${q}%`)
          .orWhere("c.apellido", "like", `%${q}%`);
      });
    }

    const [rows, [{ total }]] = await Promise.all([
      query
        .clone()
        .orderBy("v.created_at", "desc")
        .limit(limit)
        .offset(offset)
        .select(
          "v.id",
          "v.cliente_id",
          "v.patente",
          "v.marca",
          "v.modelo",
          "v.anio",
          "v.color",
          "v.tipo_combustible",
          "v.km_ultimo_ingreso",
          "c.nombre as cliente_nombre",
          "c.apellido as cliente_apellido",
          "c.telefono as cliente_telefono"
        ),
      query.clone().count("v.id as total"),
    ]);

    return { rows, total: Number(total), page, limit };
  },

  async findById(id) {
    return db("vehiculos as v")
      .join("clientes as c", "v.cliente_id", "c.id")
      .where("v.id", id)
      .where("v.activo", 1)
      .where("c.activo", 1)
      .select(
        "v.*",
        "c.nombre as cliente_nombre",
        "c.apellido as cliente_apellido",
        "c.telefono as cliente_telefono"
      )
      .first();
  },

  async findByPatente(patente) {
    return db("vehiculos as v")
      .leftJoin("clientes as c", "v.cliente_id", "c.id")
      .where({ "v.patente_normalizada": patente, "v.activo": 1 })
      .select(
        "v.id",
        "v.cliente_id",
        "v.patente",
        "v.marca",
        "v.modelo",
        "v.anio",
        "c.nombre as cliente_nombre",
        "c.apellido as cliente_apellido"
      )
      .first();
  },

  async create(data) {
    const payload = {
      ...data,
      patente_normalizada: data.patente,
      color: data.color || null,
      numero_motor: data.numero_motor || null,
      numero_chasis: data.numero_chasis || null,
      observaciones: data.observaciones || null,
      anio: data.anio || null,
    };

    const [id] = await db("vehiculos").insert(payload);
    return this.findById(id);
  },

  async update(id, data) {
    const payload = {
      ...data,
      ...(data.color !== undefined && { color: data.color || null }),
      ...(data.numero_motor !== undefined && { numero_motor: data.numero_motor || null }),
      ...(data.numero_chasis !== undefined && { numero_chasis: data.numero_chasis || null }),
      ...(data.observaciones !== undefined && { observaciones: data.observaciones || null }),
      ...(data.anio !== undefined && { anio: data.anio || null }),
      updated_at: db.fn.now(),
    };

    await db("vehiculos").where({ id }).update(payload);
    return this.findById(id);
  },

  async softDelete(id) {
    // Mangle the unique patente fields so the same plate can be re-registered later.
    return db("vehiculos")
      .where({ id })
      .update({
        activo: 0,
        patente: db.raw("CONCAT(patente, ' (eliminado)')"),
        patente_normalizada: db.raw("CONCAT(patente_normalizada, ?)", [`_del_${id}`]),
        updated_at: db.fn.now(),
      });
  },

  async getHistorial(id, limit) {
    const ordenesQuery = db("ordenes as o")
      .where({ "o.vehiculo_id": id, "o.estado": "cerrada" })
      .orderBy("o.closed_at", "desc")
      .select("o.id", "o.numero", "o.km_entrada", "o.total", "o.created_at", "o.closed_at", "o.notas_mecanico");

    if (limit) {
      ordenesQuery.limit(limit);
    }

    const ordenes = await ordenesQuery;

    if (!ordenes.length) {
      return [];
    }

    const ordenIds = ordenes.map((orden) => orden.id);

    const [servicios, productos] = await Promise.all([
      db("orden_servicios as os")
        .join("servicios as s", "os.servicio_id", "s.id")
        .whereIn("os.orden_id", ordenIds)
        .select("os.orden_id", "os.id", "os.descripcion", "os.subtotal", "s.nombre as servicio_nombre"),
      db("orden_productos as op")
        .join("productos as p", "op.producto_id", "p.id")
        .whereIn("op.orden_id", ordenIds)
        .select("op.orden_id", "op.id", "op.descripcion", "op.subtotal", "p.nombre as producto_nombre"),
    ]);

    const serviciosPorOrden = servicios.reduce((accumulator, servicio) => {
      if (!accumulator[servicio.orden_id]) {
        accumulator[servicio.orden_id] = [];
      }

      accumulator[servicio.orden_id].push(servicio);
      return accumulator;
    }, {});

    const productosPorOrden = productos.reduce((accumulator, producto) => {
      if (!accumulator[producto.orden_id]) {
        accumulator[producto.orden_id] = [];
      }

      accumulator[producto.orden_id].push(producto);
      return accumulator;
    }, {});

    return ordenes.map((orden) => ({
      ...orden,
      servicios: serviciosPorOrden[orden.id] || [],
      productos: productosPorOrden[orden.id] || [],
    }));
  },

  async getStats(id) {
    const [stats] = await db("ordenes")
      .where({ vehiculo_id: id, estado: "cerrada" })
      .select(
        db.raw("COUNT(*) as total_visitas"),
        db.raw("COALESCE(SUM(total), 0) as total_facturado"),
        db.raw("MAX(closed_at) as ultima_visita")
      );

    return stats;
  },
};

module.exports = VehiculosRepository;
