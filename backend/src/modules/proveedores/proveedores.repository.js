const db = require("../../shared/db/knex");

const ProveedoresRepository = {
  // ── CRUD ──────────────────────────────────────────────────────────────────

  async findAll({ q, page, limit }) {
    const offset = (page - 1) * limit;
    const query = db("proveedores").where("activo", 1);

    if (q) {
      query.andWhere(function applySearch() {
        this.where("nombre", "like", `%${q}%`)
          .orWhere("cuit", "like", `%${q}%`)
          .orWhere("telefono", "like", `%${q}%`);
      });
    }

    const [rows, [{ total }]] = await Promise.all([
      query
        .clone()
        .orderBy("nombre", "asc")
        .limit(limit)
        .offset(offset)
        .select(
          "proveedores.*",
          // Traemos el saldo de CC si existe para mostrarlo en el listado
          db.raw(`(
            SELECT cc.saldo
            FROM cuentas_corrientes_proveedores cc
            WHERE cc.proveedor_id = proveedores.id AND cc.activa = 1
            LIMIT 1
          ) as saldo_cc`),
          db.raw(`(
            SELECT cc.activa
            FROM cuentas_corrientes_proveedores cc
            WHERE cc.proveedor_id = proveedores.id
            LIMIT 1
          ) as tiene_cc`)
        ),
      query.clone().count("id as total"),
    ]);

    return { rows, total: Number(total), page, limit };
  },

  async findById(id) {
    return db("proveedores").where({ id, activo: 1 }).first();
  },

  async create(data) {
    const payload = {
      ...data,
      cuit: data.cuit || null,
      telefono: data.telefono || null,
      email: data.email || null,
      condicion_pago: data.condicion_pago || null,
      notas: data.notas || null,
    };

    const [id] = await db("proveedores").insert(payload);
    return db("proveedores").where({ id }).first();
  },

  async update(id, data) {
    const payload = {
      ...data,
      ...(data.cuit !== undefined && { cuit: data.cuit || null }),
      ...(data.telefono !== undefined && { telefono: data.telefono || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.condicion_pago !== undefined && {
        condicion_pago: data.condicion_pago || null,
      }),
      ...(data.notas !== undefined && { notas: data.notas || null }),
      updated_at: db.fn.now(),
    };

    await db("proveedores").where({ id }).update(payload);
    return db("proveedores").where({ id }).first();
  },

  async softDelete(id) {
    return db("proveedores")
      .where({ id })
      .update({ activo: 0, updated_at: db.fn.now() });
  },

  // ── CUENTA CORRIENTE ──────────────────────────────────────────────────────

  async findCuentaCorriente(proveedorId) {
    return db("cuentas_corrientes_proveedores")
      .where({ proveedor_id: proveedorId })
      .first();
  },

  async crearCuentaCorriente(proveedorId, saldoInicial = 0) {
    const [id] = await db("cuentas_corrientes_proveedores").insert({
      proveedor_id: proveedorId,
      activa: true,
      saldo: saldoInicial,
    });
    return db("cuentas_corrientes_proveedores").where({ id }).first();
  },

  async toggleActiva(proveedorId, nuevaActiva) {
    await db("cuentas_corrientes_proveedores")
      .where({ proveedor_id: proveedorId })
      .update({ activa: nuevaActiva ? 1 : 0, updated_at: db.fn.now() });
    return db("cuentas_corrientes_proveedores")
      .where({ proveedor_id: proveedorId })
      .first();
  },

  // conn puede ser una transacción (trx) o el db normal
  async insertMovimiento(conn, { proveedor_id, tipo, monto, descripcion, compra_id, empleado_id }) {
    const [id] = await conn("movimientos_cuenta_proveedor").insert({
      proveedor_id,
      tipo,
      monto,
      descripcion,
      compra_id: compra_id || null,
      empleado_id: empleado_id || null,
    });
    return id;
  },

  // delta > 0 = aumenta deuda, delta < 0 = disminuye deuda
  async incrementSaldo(conn, proveedorId, delta) {
    await conn("cuentas_corrientes_proveedores")
      .where({ proveedor_id: proveedorId })
      .increment("saldo", delta);
  },

  async findMovimientos(proveedorId, { page, limit, desde, hasta }) {
    const offset = (page - 1) * limit;
    const query = db("movimientos_cuenta_proveedor as m")
      .leftJoin("empleados as e", "m.empleado_id", "e.id")
      .leftJoin("compras as c", "m.compra_id", "c.id")
      .where("m.proveedor_id", proveedorId);

    if (desde) query.where("m.created_at", ">=", desde);
    if (hasta) query.where("m.created_at", "<=", `${hasta} 23:59:59`);

    const [rows, [{ total }]] = await Promise.all([
      query
        .clone()
        .orderBy("m.created_at", "desc")
        .limit(limit)
        .offset(offset)
        .select(
          "m.id",
          "m.tipo",
          "m.monto",
          "m.descripcion",
          "m.compra_id",
          "m.created_at",
          db.raw(
            "CONCAT(COALESCE(e.nombre,''), ' ', COALESCE(e.apellido,'')) as empleado_nombre"
          ),
          "c.fecha as compra_fecha",
          "c.total as compra_total"
        ),
      query.clone().count("m.id as total"),
    ]);

    return { rows, total: Number(total), page, limit };
  },
};

module.exports = ProveedoresRepository;
