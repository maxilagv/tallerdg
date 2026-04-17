const db = require("../../shared/db/knex");
const PagosRepository = require("../pagos/pagos.repository");

function applyPagoColumns(query, alias = "o", trx = db) {
  return query.leftJoin(PagosRepository.pagosActivosSubquery(trx), `${alias}.id`, "pa.orden_id");
}

const OrdenesRepository = {
  async findAll({ page = 1, limit = 20, estado, cliente_id, q } = {}) {
    const offset = (page - 1) * limit;
    const query = applyPagoColumns(
      db("ordenes as o")
        .join("clientes as c", "o.cliente_id", "c.id")
        .join("vehiculos as v", "o.vehiculo_id", "v.id")
        .leftJoin("empleados as e", "o.empleado_id", "e.id")
    );

    if (estado) {
      query.where("o.estado", estado);
    }

    if (cliente_id) {
      query.andWhere("o.cliente_id", cliente_id);
    }

    if (q) {
      const patenteNormalizada = q.replace(/\s+/g, "").toUpperCase();

      query.andWhere(function applySearch() {
        this.where("o.numero", "like", `%${q}%`)
          .orWhere("v.patente_normalizada", "like", `%${patenteNormalizada}%`)
          .orWhere("c.nombre", "like", `%${q}%`)
          .orWhere("c.apellido", "like", `%${q}%`);
      });
    }

    const [rows, [{ total }]] = await Promise.all([
      query
        .clone()
        .orderBy("o.created_at", "desc")
        .limit(limit)
        .offset(offset)
        .select(
          "o.id",
          "o.numero",
          "o.estado",
          "o.estado_pago",
          "o.total",
          "o.km_entrada",
          "o.created_at",
          "o.closed_at",
          db.raw("COALESCE(pa.total_pagado, 0) as total_pagado"),
          db.raw("COALESCE(pa.cantidad_pagos, 0) as cantidad_pagos"),
          db.raw("GREATEST(o.total - COALESCE(pa.total_pagado, 0), 0) as saldo_pendiente"),
          "c.id as cliente_id",
          "c.nombre as cliente_nombre",
          "c.apellido as cliente_apellido",
          "c.telefono as cliente_telefono",
          "v.id as vehiculo_id",
          "v.patente",
          "v.marca",
          "v.modelo",
          db.raw("CONCAT(COALESCE(e.nombre, ''), ' ', COALESCE(e.apellido, '')) as empleado_nombre")
        ),
      query.clone().count("o.id as total"),
    ]);

    return { rows, total: Number(total), page, limit };
  },

  async findById(id, trx = db) {
    return trx("ordenes").where({ id }).first();
  },

  async findByIdCompleta(id, trx = db) {
    const orden = await applyPagoColumns(
      trx("ordenes as o")
        .join("clientes as c", "o.cliente_id", "c.id")
        .join("vehiculos as v", "o.vehiculo_id", "v.id")
        .leftJoin("empleados as e", "o.empleado_id", "e.id")
        .leftJoin("remitos as r", "o.id", "r.orden_id"),
      "o",
      trx
    )
      .where("o.id", id)
      .select(
        "o.*",
        "r.numero as remito_numero",
        "r.pdf_url as remito_pdf_url",
        "c.nombre as cliente_nombre",
        "c.apellido as cliente_apellido",
        "c.telefono as cliente_telefono",
        "v.cliente_id",
        "v.patente",
        "v.marca",
        "v.modelo",
        "v.anio",
        "v.tipo_combustible",
        "v.km_ultimo_ingreso",
        db.raw("CONCAT(COALESCE(e.nombre, ''), ' ', COALESCE(e.apellido, '')) as empleado_nombre"),
        db.raw("COALESCE(pa.total_pagado, 0) as total_pagado"),
        db.raw("COALESCE(pa.cantidad_pagos, 0) as cantidad_pagos"),
        db.raw("GREATEST(o.total - COALESCE(pa.total_pagado, 0), 0) as saldo_pendiente")
      )
      .first();

    if (!orden) {
      return null;
    }

    const [servicios, productos, pagos] = await Promise.all([
      trx("orden_servicios as os")
        .join("servicios as s", "os.servicio_id", "s.id")
        .where("os.orden_id", id)
        .orderBy("os.id", "asc")
        .select("os.*", "s.nombre as servicio_nombre"),
      trx("orden_productos as op")
        .join("productos as p", "op.producto_id", "p.id")
        .where("op.orden_id", id)
        .orderBy("op.id", "asc")
        .select("op.*", "p.nombre as producto_nombre", "p.codigo", "p.unidad"),
      PagosRepository.findByOrdenId(id, { include_anulados: true }, trx),
    ]);

    return { ...orden, servicios, productos, pagos };
  },

  async findHistorialVehiculo(vehiculoId, limit = 3, excludeOrdenId = null, trx = db) {
    const query = trx("ordenes as o")
      .where("o.vehiculo_id", vehiculoId)
      .where("o.estado", "cerrada");

    if (excludeOrdenId) {
      query.andWhere("o.id", "!=", excludeOrdenId);
    }

    return query
      .orderBy("o.closed_at", "desc")
      .limit(limit)
      .select("o.id", "o.numero", "o.total", "o.km_entrada", "o.closed_at", "o.notas_mecanico");
  },
};

module.exports = OrdenesRepository;
