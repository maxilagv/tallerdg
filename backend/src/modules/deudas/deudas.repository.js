const db = require("../../shared/db/knex");

const DeudasRepository = {
  async findAll({ page, limit, cliente_id, estado, q }) {
    const offset = (page - 1) * limit;

    const query = db("deudas as d")
      .join("clientes as c", "d.cliente_id", "c.id")
      .leftJoin("empleados as e", "d.empleado_id", "e.id")
      .where("d.activo", 1);

    if (cliente_id) {
      query.andWhere("d.cliente_id", cliente_id);
    }

    if (estado) {
      query.andWhere("d.estado", estado);
    }

    if (q) {
      query.andWhere(function () {
        this.where("c.nombre", "like", `%${q}%`)
          .orWhere("c.apellido", "like", `%${q}%`)
          .orWhere("d.concepto", "like", `%${q}%`);
      });
    }

    const [rows, [{ total }], [resumen]] = await Promise.all([
      query
        .clone()
        .orderBy("d.created_at", "desc")
        .limit(limit)
        .offset(offset)
        .select(
          "d.id",
          "d.cliente_id",
          "d.concepto",
          "d.monto_original",
          "d.monto_pagado",
          db.raw("GREATEST(d.monto_original - d.monto_pagado, 0) as saldo"),
          "d.fecha",
          "d.estado",
          "d.notas",
          "d.created_at",
          "c.nombre as cliente_nombre",
          "c.apellido as cliente_apellido",
          "c.telefono as cliente_telefono",
          db.raw("CONCAT(COALESCE(e.nombre,''),' ',COALESCE(e.apellido,'')) as empleado_nombre")
        ),
      query.clone().count("d.id as total"),
      db("deudas")
        .where("activo", 1)
        .whereIn("estado", ["pendiente", "parcial"])
        .select(
          db.raw("COALESCE(SUM(monto_original - monto_pagado), 0) as total_pendiente"),
          db.raw("COUNT(*) as cantidad")
        ),
    ]);

    return {
      rows,
      total: Number(total),
      page,
      limit,
      total_pendiente: Number(resumen?.total_pendiente) || 0,
      cantidad_pendiente: Number(resumen?.cantidad) || 0,
    };
  },

  async findById(id) {
    return db("deudas as d")
      .join("clientes as c", "d.cliente_id", "c.id")
      .leftJoin("empleados as e", "d.empleado_id", "e.id")
      .where("d.id", id)
      .where("d.activo", 1)
      .select(
        "d.*",
        db.raw("GREATEST(d.monto_original - d.monto_pagado, 0) as saldo"),
        "c.nombre as cliente_nombre",
        "c.apellido as cliente_apellido",
        "c.telefono as cliente_telefono",
        db.raw("CONCAT(COALESCE(e.nombre,''),' ',COALESCE(e.apellido,'')) as empleado_nombre")
      )
      .first();
  },

  async create(data) {
    const [id] = await db("deudas").insert(data);
    return this.findById(id);
  },

  async update(id, data) {
    await db("deudas").where({ id }).update({ ...data, updated_at: db.fn.now() });
    return this.findById(id);
  },

  async abonar(id, montoAbono) {
    await db("deudas").where({ id }).update({
      monto_pagado: db.raw("monto_pagado + ?", [montoAbono]),
      updated_at: db.fn.now(),
    });

    // Recalcular estado
    const deuda = await db("deudas").where({ id }).first();
    const saldo = Number(deuda.monto_original) - Number(deuda.monto_pagado);
    let nuevoEstado;
    if (saldo <= 0) {
      nuevoEstado = "pagada";
    } else if (Number(deuda.monto_pagado) > 0) {
      nuevoEstado = "parcial";
    } else {
      nuevoEstado = "pendiente";
    }

    await db("deudas").where({ id }).update({ estado: nuevoEstado, updated_at: db.fn.now() });
    return this.findById(id);
  },

  async softDelete(id) {
    return db("deudas").where({ id }).update({ activo: 0, updated_at: db.fn.now() });
  },

  async getResumenPorCliente() {
    const rows = await db("deudas as d")
      .join("clientes as c", "d.cliente_id", "c.id")
      .where("d.activo", 1)
      .whereIn("d.estado", ["pendiente", "parcial"])
      .groupBy("d.cliente_id", "c.nombre", "c.apellido", "c.telefono")
      .orderByRaw("SUM(d.monto_original - d.monto_pagado) DESC")
      .select(
        "d.cliente_id",
        "c.nombre as cliente_nombre",
        "c.apellido as cliente_apellido",
        "c.telefono as cliente_telefono",
        db.raw("COUNT(d.id) as cantidad_deudas"),
        db.raw("COALESCE(SUM(d.monto_original - d.monto_pagado), 0) as total_deuda")
      );

    const totalGeneral = rows.reduce((acc, r) => acc + Number(r.total_deuda), 0);

    return { clientes: rows, total_general: totalGeneral };
  },

  async getSaldoPendienteCliente(clienteId) {
    const resumen = await db("deudas")
      .where("activo", 1)
      .where("cliente_id", clienteId)
      .whereIn("estado", ["pendiente", "parcial"])
      .select(
        db.raw("COUNT(id) as cantidad_deudas"),
        db.raw("COALESCE(SUM(monto_original - monto_pagado), 0) as total_deuda")
      )
      .first();

    return {
      cantidad_deudas: Number(resumen?.cantidad_deudas) || 0,
      total_deuda: Number(resumen?.total_deuda) || 0,
    };
  },
};

module.exports = DeudasRepository;
