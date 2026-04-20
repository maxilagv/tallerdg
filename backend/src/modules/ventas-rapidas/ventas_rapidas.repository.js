const db = require("../../shared/db/knex");
const AppError = require("../../shared/errors/AppError");

const VentasRapidasRepository = {
  async create(data, items, empleadoId) {
    return db.transaction(async (trx) => {
      const total = items.reduce(
        (s, i) => s + Number(i.cantidad) * Number(i.precio_unitario),
        0
      );

      const [ventaId] = await trx("ventas_rapidas").insert({
        fecha: data.fecha,
        total,
        medio_pago: data.medio_pago || "efectivo",
        notas: data.notas || null,
        empleado_id: empleadoId || null,
      });

      for (const item of items) {
        const subtotal = Number(item.cantidad) * Number(item.precio_unitario);

        await trx("venta_rapida_items").insert({
          venta_id: ventaId,
          producto_id: item.producto_id || null,
          producto_nombre: item.producto_nombre,
          unidad: item.unidad || "unidad",
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal,
        });

        // Descontar stock si viene con producto_id
        if (item.producto_id) {
          const producto = await trx("productos")
            .where({ id: item.producto_id })
            .first();

          if (!producto) {
            throw new AppError(
              `Producto con id ${item.producto_id} no encontrado.`,
              404,
              "NOT_FOUND"
            );
          }

          const stockAnterior = Number(producto.stock_actual);
          const stockNuevo = stockAnterior - Number(item.cantidad);

          await trx("productos")
            .where({ id: item.producto_id })
            .update({ stock_actual: stockNuevo, updated_at: trx.fn.now() });

          await trx("movimientos_stock").insert({
            producto_id: item.producto_id,
            tipo: "salida",
            cantidad: item.cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            referencia_tipo: "venta_rapida",
            referencia_id: ventaId,
            empleado_id: empleadoId || null,
          });
        }
      }

      return ventaId;
    });
  },

  async findAll({ page, limit, desde, hasta }) {
    const offset = (page - 1) * limit;
    const query = db("ventas_rapidas as v").leftJoin(
      "empleados as e",
      "v.empleado_id",
      "e.id"
    );

    if (desde) query.where("v.fecha", ">=", desde);
    if (hasta) query.where("v.fecha", "<=", hasta);

    const [rows, [{ total }]] = await Promise.all([
      query
        .clone()
        .orderBy("v.created_at", "desc")
        .limit(limit)
        .offset(offset)
        .select(
          "v.id",
          "v.fecha",
          "v.total",
          "v.medio_pago",
          "v.notas",
          "v.created_at",
          db.raw(
            "CONCAT(COALESCE(e.nombre,''), ' ', COALESCE(e.apellido,'')) as empleado_nombre"
          )
        ),
      query.clone().count("v.id as total"),
    ]);

    return { rows, total: Number(total), page, limit };
  },

  async findById(id) {
    const venta = await db("ventas_rapidas as v")
      .leftJoin("empleados as e", "v.empleado_id", "e.id")
      .where("v.id", id)
      .select(
        "v.*",
        db.raw(
          "CONCAT(COALESCE(e.nombre,''), ' ', COALESCE(e.apellido,'')) as empleado_nombre"
        )
      )
      .first();

    if (!venta) return null;

    const items = await db("venta_rapida_items").where({ venta_id: id });
    return { ...venta, items };
  },

  async saldoCajaHoy() {
    const today = new Date().toISOString().slice(0, 10);
    const result = await db("ventas_rapidas")
      .where("medio_pago", "efectivo")
      .where("fecha", today)
      .sum("total as total")
      .first();
    return { total: Number(result?.total ?? 0) };
  },
};

module.exports = VentasRapidasRepository;
