const db = require("../../shared/db/knex");

const ProductosRepository = {
  async findAll({ page, limit, categoria_id, q, stock_bajo }) {
    const offset = (page - 1) * limit;
    const query = db("productos as p")
      .join("categorias as c", "p.categoria_id", "c.id")
      .leftJoin("proveedores as pv", "p.proveedor_id", "pv.id")
      .where("p.activo", 1)
      .where("c.tipo", "producto");

    if (categoria_id) {
      query.andWhere("p.categoria_id", categoria_id);
    }

    if (q) {
      query.andWhere(function applySearch() {
        this.where("p.nombre", "like", `%${q}%`)
          .orWhere("p.codigo", "like", `%${q}%`)
          .orWhere("p.marca", "like", `%${q}%`);
      });
    }

    if (stock_bajo) {
      query.andWhereRaw("p.stock_actual <= p.stock_minimo");
    }

    const [rows, [{ total }]] = await Promise.all([
      query
        .clone()
        .orderBy("p.nombre", "asc")
        .limit(limit)
        .offset(offset)
        .select(
          "p.id",
          "p.categoria_id",
          "p.proveedor_id",
          "p.nombre",
          "p.codigo",
          "p.marca",
          "p.descripcion",
          "p.precio_costo",
          "p.precio_venta",
          "p.stock_actual",
          "p.stock_minimo",
          "p.unidad",
          "p.created_at",
          "c.nombre as categoria_nombre",
          "pv.nombre as proveedor_nombre"
        ),
      query.clone().count("p.id as total"),
    ]);

    return { rows, total: Number(total), page, limit };
  },

  async findById(id) {
    const producto = await db("productos as p")
      .join("categorias as c", "p.categoria_id", "c.id")
      .leftJoin("proveedores as pv", "p.proveedor_id", "pv.id")
      .where("p.id", id)
      .where("p.activo", 1)
      .select("p.*", "c.nombre as categoria_nombre", "pv.nombre as proveedor_nombre")
      .first();

    if (!producto) {
      return null;
    }

    const movimientos = await db("movimientos_stock")
      .where({ producto_id: id })
      .orderBy("created_at", "desc")
      .limit(10);

    return { ...producto, movimientos };
  },

  async create(data) {
    const payload = {
      ...data,
      proveedor_id: data.proveedor_id || null,
      codigo: data.codigo || null,
      marca: data.marca || null,
      descripcion: data.descripcion || null,
    };

    const [id] = await db("productos").insert(payload);
    return this.findById(id);
  },

  async update(id, data) {
    const payload = {
      ...data,
      ...(data.proveedor_id !== undefined && { proveedor_id: data.proveedor_id || null }),
      ...(data.codigo !== undefined && { codigo: data.codigo || null }),
      ...(data.marca !== undefined && { marca: data.marca || null }),
      ...(data.descripcion !== undefined && { descripcion: data.descripcion || null }),
      updated_at: db.fn.now(),
    };

    await db("productos").where({ id }).update(payload);
    return this.findById(id);
  },

  async softDelete(id) {
    return db("productos")
      .where({ id })
      .update({ activo: 0, updated_at: db.fn.now() });
  },

  async findStockBajo() {
    return db("productos as p")
      .join("categorias as c", "p.categoria_id", "c.id")
      .leftJoin("proveedores as pv", "p.proveedor_id", "pv.id")
      .where("p.activo", 1)
      .whereRaw("p.stock_actual <= p.stock_minimo")
      .orderBy("p.stock_actual", "asc")
      .select("p.*", "c.nombre as categoria_nombre", "pv.nombre as proveedor_nombre");
  },

  async ajustarStock(id, { nuevo_stock, motivo }, empleadoId) {
    return db.transaction(async (trx) => {
      const producto = await trx("productos").where({ id, activo: 1 }).first();

      if (!producto) {
        return null;
      }

      const stockAnterior = Number(producto.stock_actual);
      const stockNuevo = Number(nuevo_stock);
      const diferencia = Math.abs(stockNuevo - stockAnterior);

      await trx("productos")
        .where({ id })
        .update({ stock_actual: stockNuevo, updated_at: trx.fn.now() });

      if (diferencia > 0) {
        await trx("movimientos_stock").insert({
          producto_id: id,
          tipo: "ajuste",
          cantidad: diferencia,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          referencia_tipo: "ajuste_manual",
          empleado_id: empleadoId || null,
          notas: motivo,
        });
      }

      return this.findById(id);
    });
  },
};

module.exports = ProductosRepository;
