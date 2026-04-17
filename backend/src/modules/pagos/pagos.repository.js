const db = require("../../shared/db/knex");

function applyFiltros(query, filtros = {}, alias = "p") {
  if (!filtros.include_anulados) {
    query.whereNull(`${alias}.anulado_at`);
  }

  if (filtros.orden_id) {
    query.andWhere(`${alias}.orden_id`, filtros.orden_id);
  }

  if (filtros.metodo) {
    query.andWhere(`${alias}.metodo`, filtros.metodo);
  }

  if (filtros.empleado_id) {
    query.andWhere(`${alias}.empleado_id`, filtros.empleado_id);
  }

  if (filtros.desde) {
    query.andWhere(`${alias}.created_at`, ">=", `${filtros.desde} 00:00:00`);
  }

  if (filtros.hasta) {
    query.andWhere(`${alias}.created_at`, "<=", `${filtros.hasta} 23:59:59`);
  }

  return query;
}

function pagosActivosSubquery(trx = db) {
  return trx("pagos as p")
    .whereNull("p.anulado_at")
    .groupBy("p.orden_id")
    .select("p.orden_id")
    .sum("p.monto as total_pagado")
    .count("p.id as cantidad_pagos")
    .as("pa");
}

function baseListQuery(filtros = {}, trx = db) {
  const query = trx("pagos as p")
    .join("ordenes as o", "p.orden_id", "o.id")
    .join("clientes as c", "o.cliente_id", "c.id")
    .join("vehiculos as v", "o.vehiculo_id", "v.id")
    .leftJoin("empleados as e", "p.empleado_id", "e.id")
    .leftJoin("empleados as ea", "p.anulado_por", "ea.id");

  applyFiltros(query, filtros, "p");
  return query;
}

const PagosRepository = {
  pagosActivosSubquery,

  async findById(id, trx = db) {
    return trx("pagos").where({ id }).first();
  },

  async findByIdForUpdate(id, trx) {
    return trx("pagos").where({ id }).forUpdate().first();
  },

  async create(data, trx) {
    const [id] = await trx("pagos").insert(data);
    return id;
  },

  async cancelar(id, data, trx) {
    await trx("pagos").where({ id }).update({
      anulado_at: trx.fn.now(),
      anulado_por: data.anulado_por,
      motivo_anulacion: data.motivo_anulacion,
    });
  },

  async sumActivosByOrdenId(ordenId, trx = db) {
    const [{ total }] = await trx("pagos")
      .where({ orden_id: ordenId })
      .whereNull("anulado_at")
      .sum("monto as total");

    return Number(total) || 0;
  },

  async findByOrdenId(ordenId, { include_anulados = false } = {}, trx = db) {
    const query = baseListQuery({ orden_id: ordenId, include_anulados }, trx);

    return query
      .orderBy("p.created_at", "desc")
      .select(
        "p.id",
        "p.orden_id",
        "p.monto",
        "p.metodo",
        "p.referencia",
        "p.notas",
        "p.created_at",
        "p.anulado_at",
        "p.motivo_anulacion",
        "p.empleado_id",
        "p.anulado_por",
        "o.numero as orden_numero",
        "o.estado_pago",
        "c.id as cliente_id",
        "c.nombre as cliente_nombre",
        "c.apellido as cliente_apellido",
        "v.patente",
        db.raw("CONCAT(COALESCE(e.nombre, ''), ' ', COALESCE(e.apellido, '')) as empleado_nombre"),
        db.raw("CONCAT(COALESCE(ea.nombre, ''), ' ', COALESCE(ea.apellido, '')) as anulado_por_nombre"),
        db.raw("CASE WHEN p.anulado_at IS NULL THEN 'activo' ELSE 'anulado' END as estado")
      );
  },

  async findAll(filtros = {}) {
    const offset = (filtros.page - 1) * filtros.limit;
    const query = baseListQuery(filtros);

    const [rows, [{ total }], resumenBase, totalesPorMetodo] = await Promise.all([
      query
        .clone()
        .orderBy("p.created_at", "desc")
        .limit(filtros.limit)
        .offset(offset)
        .select(
          "p.id",
          "p.orden_id",
          "p.monto",
          "p.metodo",
          "p.referencia",
          "p.notas",
          "p.created_at",
          "p.anulado_at",
          "p.motivo_anulacion",
          "p.empleado_id",
          "p.anulado_por",
          "o.numero as orden_numero",
          "c.id as cliente_id",
          "c.nombre as cliente_nombre",
          "c.apellido as cliente_apellido",
          "v.patente",
          db.raw("CONCAT(COALESCE(e.nombre, ''), ' ', COALESCE(e.apellido, '')) as empleado_nombre"),
          db.raw("CONCAT(COALESCE(ea.nombre, ''), ' ', COALESCE(ea.apellido, '')) as anulado_por_nombre"),
          db.raw("CASE WHEN p.anulado_at IS NULL THEN 'activo' ELSE 'anulado' END as estado")
        ),
      query.clone().count("p.id as total"),
      applyFiltros(
        db("pagos as p")
          .whereNull("p.anulado_at")
          .select(
            db.raw("COALESCE(SUM(p.monto), 0) as total_cobrado"),
            db.raw("COUNT(*) as cantidad_cobros"),
            db.raw("COUNT(DISTINCT p.orden_id) as cantidad_ordenes")
          )
          .first(),
        filtros,
        "p"
      ),
      applyFiltros(
        db("pagos as p")
          .whereNull("p.anulado_at")
          .groupBy("p.metodo")
          .orderBy("p.metodo", "asc")
          .select("p.metodo", db.raw("COALESCE(SUM(p.monto), 0) as total")),
        filtros,
        "p"
      ),
    ]);

    return {
      rows,
      total: Number(total) || 0,
      page: filtros.page,
      limit: filtros.limit,
      resumen: {
        total_cobrado: Number(resumenBase?.total_cobrado) || 0,
        cantidad_cobros: Number(resumenBase?.cantidad_cobros) || 0,
        cantidad_ordenes: Number(resumenBase?.cantidad_ordenes) || 0,
        totales_por_metodo: totalesPorMetodo.map((item) => ({
          metodo: item.metodo,
          total: Number(item.total) || 0,
        })),
      },
    };
  },

  async findAllForExport(filtros = {}) {
    const query = baseListQuery({ ...filtros, include_anulados: filtros.include_anulados ?? false });

    return query
      .clone()
      .orderBy("p.created_at", "desc")
      .select(
        "p.id",
        "p.orden_id",
        "p.monto",
        "p.metodo",
        "p.referencia",
        "p.notas",
        "p.created_at",
        "p.anulado_at",
        "p.motivo_anulacion",
        "o.numero as orden_numero",
        "c.nombre as cliente_nombre",
        "c.apellido as cliente_apellido",
        "v.patente",
        db.raw("CONCAT(COALESCE(e.nombre, ''), ' ', COALESCE(e.apellido, '')) as empleado_nombre"),
        db.raw("CASE WHEN p.anulado_at IS NULL THEN 'Activo' ELSE 'Anulado' END as estado")
      );
  },

  async getSaldoOrden(ordenId, trx = db) {
    return trx("ordenes as o")
      .leftJoin(pagosActivosSubquery(trx), "o.id", "pa.orden_id")
      .where("o.id", ordenId)
      .select(
        "o.id",
        "o.numero",
        "o.estado",
        "o.estado_pago",
        "o.total",
        "o.cliente_id",
        db.raw("COALESCE(pa.total_pagado, 0) as total_pagado"),
        db.raw("COALESCE(pa.cantidad_pagos, 0) as cantidad_pagos"),
        db.raw("GREATEST(o.total - COALESCE(pa.total_pagado, 0), 0) as saldo_pendiente")
      )
      .first();
  },

  async getDeudaCliente(clienteId, trx = db) {
    const rows = await trx("ordenes as o")
      .leftJoin(pagosActivosSubquery(trx), "o.id", "pa.orden_id")
      .where("o.cliente_id", clienteId)
      .where("o.estado", "cerrada")
      .whereRaw("GREATEST(o.total - COALESCE(pa.total_pagado, 0), 0) > 0")
      .orderBy("o.closed_at", "desc")
      .select(
        "o.id",
        "o.numero",
        "o.total",
        "o.estado_pago",
        "o.closed_at",
        db.raw("COALESCE(pa.total_pagado, 0) as total_pagado"),
        db.raw("COALESCE(pa.cantidad_pagos, 0) as cantidad_pagos"),
        db.raw("GREATEST(o.total - COALESCE(pa.total_pagado, 0), 0) as saldo_pendiente")
      );

    return {
      total_deuda: rows.reduce((acc, row) => acc + (Number(row.saldo_pendiente) || 0), 0),
      ordenes: rows,
    };
  },

  async getResumenDeudasOrdenes(trx = db) {
    const rows = await trx("ordenes as o")
      .join("clientes as c", "o.cliente_id", "c.id")
      .leftJoin(pagosActivosSubquery(trx), "o.id", "pa.orden_id")
      .where("o.estado", "cerrada")
      .whereRaw("GREATEST(o.total - COALESCE(pa.total_pagado, 0), 0) > 0")
      .groupBy("o.cliente_id", "c.nombre", "c.apellido", "c.telefono")
      .select(
        "o.cliente_id",
        "c.nombre as cliente_nombre",
        "c.apellido as cliente_apellido",
        "c.telefono as cliente_telefono",
        db.raw("COUNT(o.id) as cantidad_deudas"),
        db.raw("SUM(GREATEST(o.total - COALESCE(pa.total_pagado, 0), 0)) as total_deuda")
      );
    return rows;
  },
};

module.exports = PagosRepository;
