const db = require("../../shared/db/knex");
const AppError = require("../../shared/errors/AppError");

const ComprasRepository = {
  async findAll({ page, limit, proveedor_id, desde, hasta }) {
    const offset = (page - 1) * limit;
    const query = db("compras as c")
      .leftJoin("proveedores as p", "c.proveedor_id", "p.id")
      .leftJoin("empleados as e", "c.empleado_id", "e.id");

    if (proveedor_id) query.where("c.proveedor_id", proveedor_id);
    if (desde) query.where("c.fecha", ">=", desde);
    if (hasta) query.where("c.fecha", "<=", hasta);

    const [rows, [{ total }]] = await Promise.all([
      query
        .clone()
        .orderBy("c.fecha", "desc")
        .limit(limit)
        .offset(offset)
        .select(
          "c.id",
          "c.fecha",
          "c.total",
          "c.notas",
          "c.origen_tipo",
          "c.origen_nombre",
          "c.actualiza_stock",
          "c.created_at",
          "p.nombre as proveedor_nombre",
          db.raw(
            "CONCAT(COALESCE(e.nombre,''), ' ', COALESCE(e.apellido,'')) as empleado_nombre"
          )
        ),
      query.clone().count("c.id as total"),
    ]);

    return { rows, total: Number(total), page, limit };
  },

  async findById(id) {
    const compra = await db("compras as c")
      .leftJoin("proveedores as p", "c.proveedor_id", "p.id")
      .where("c.id", id)
      .select("c.*", "p.nombre as proveedor_nombre")
      .first();

    if (!compra) return null;

    const items = await db("compra_items as ci")
      .leftJoin("productos as pr", "ci.producto_id", "pr.id")
      .where("ci.compra_id", id)
      .select("ci.*", "pr.nombre as producto_nombre", "pr.codigo", "pr.unidad");

    return { ...compra, items };
  },

  async create(data, items) {
    return db.transaction(async (trx) => {
      const [compraId] = await trx("compras").insert(data);

      for (const item of items) {
        const subtotal = Number(item.cantidad) * Number(item.precio_unitario);
        await trx("compra_items").insert({
          compra_id: compraId,
          producto_id: item.producto_id || null,
          descripcion: item.descripcion || null,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal,
        });

        if (!data.actualiza_stock) {
          continue;
        }

        const producto = await trx("productos")
          .where({ id: item.producto_id })
          .first();
        const stockNuevo = Number(producto.stock_actual) + Number(item.cantidad);

        await trx("productos")
          .where({ id: item.producto_id })
          .update({ stock_actual: stockNuevo, updated_at: trx.fn.now() });

        await trx("movimientos_stock").insert({
          producto_id: item.producto_id,
          tipo: "entrada",
          cantidad: item.cantidad,
          stock_anterior: Number(producto.stock_actual),
          stock_nuevo: stockNuevo,
          referencia_tipo: "compra",
          referencia_id: compraId,
          empleado_id: data.empleado_id || null,
        });
      }

      // Si el proveedor tiene cuenta corriente activa, registrar la deuda automáticamente
      if (data.proveedor_id) {
        const cc = await trx("cuentas_corrientes_proveedores")
          .where({ proveedor_id: data.proveedor_id, activa: 1 })
          .first();

        if (cc) {
          await trx("movimientos_cuenta_proveedor").insert({
            proveedor_id: data.proveedor_id,
            tipo: "deuda",
            monto: data.total,
            descripcion: `Compra del ${data.fecha}`,
            compra_id: compraId,
            empleado_id: data.empleado_id || null,
          });

          await trx("cuentas_corrientes_proveedores")
            .where({ proveedor_id: data.proveedor_id })
            .increment("saldo", data.total);
        }
      }

      return compraId;
    });
  },

  async delete(id) {
    return db.transaction(async (trx) => {
      const compra = await trx("compras").where({ id }).first();
      const items = await trx("compra_items").where({ compra_id: id });

      for (const item of items) {
        if (!compra.actualiza_stock || !item.producto_id) {
          continue;
        }

        const producto = await trx("productos")
          .where({ id: item.producto_id })
          .first();
        const stockActual = Number(producto.stock_actual);
        const cantidad = Number(item.cantidad);

        if (stockActual < cantidad) {
          throw new AppError(
            `No se puede eliminar la compra: el producto "${producto.nombre}" tiene stock insuficiente para revertir (stock: ${stockActual}, a revertir: ${cantidad})`,
            409,
            "INSUFFICIENT_STOCK_TO_REVERT"
          );
        }

        const stockNuevo = stockActual - cantidad;

        await trx("productos")
          .where({ id: item.producto_id })
          .update({ stock_actual: stockNuevo, updated_at: trx.fn.now() });

        await trx("movimientos_stock").insert({
          producto_id: item.producto_id,
          tipo: "salida",
          cantidad: cantidad,
          stock_anterior: stockActual,
          stock_nuevo: stockNuevo,
          referencia_tipo: "compra_cancelada",
          referencia_id: id,
        });
      }

      // Si había movimiento de CC para esta compra, revertirlo
      if (compra && compra.proveedor_id) {
        const movCC = await trx("movimientos_cuenta_proveedor")
          .where({ compra_id: id, tipo: "deuda" })
          .first();

        if (movCC) {
          // Crear movimiento de reversión y reducir saldo
          await trx("movimientos_cuenta_proveedor").insert({
            proveedor_id: compra.proveedor_id,
            tipo: "ajuste",
            monto: movCC.monto,
            descripcion: `Reversión por eliminación de compra #${id}`,
            compra_id: null,
            empleado_id: null,
          });

          await trx("cuentas_corrientes_proveedores")
            .where({ proveedor_id: compra.proveedor_id })
            .decrement("saldo", movCC.monto);
        }
      }

      await trx("compras").where({ id }).delete();
    });
  },
};

module.exports = ComprasRepository;
