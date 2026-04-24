const { z } = require("zod");
const db = require("../../shared/db/knex");
const AppError = require("../../shared/errors/AppError");
const logger = require("../../shared/logger");
const ClientesRepository = require("../clientes/clientes.repository");
const PagosRepository = require("../pagos/pagos.repository");
const VehiculosRepository = require("../vehiculos/vehiculos.repository");
const WhatsAppService = require("../whatsapp/whatsapp.service");
const OrdenesRepository = require("./ordenes.repository");
const { generarNumeroOrden } = require("./ordenes.helper");
const { recalcularTotales } = require("./ordenes.totales");
const {
  listOrdenesSchema,
  createOrdenSchema,
  ordenServicioSchema,
  ordenProductoSchema,
  batchProductosSchema,
  estadoOrdenSchema,
  notasOrdenSchema,
  descuentoOrdenSchema,
  recordatorioServiceSchema,
  updateOrdenSchema,
} = require("./ordenes.validation");

const idSchema = z.coerce.number().int().positive();

const transiciones = {
  abierta: ["en_proceso", "cancelada"],
  en_proceso: ["lista", "cancelada"],
  lista: ["cerrada", "en_proceso"],
  cerrada: [],
  cancelada: [],
};

function parseId(value) {
  const parsed = idSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError("Identificador inválido.", 400, "VALIDATION_ERROR");
  }

  return parsed.data;
}

function normalizarServicioRecordatorio(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function formatISODate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function normalizarFechaMovimiento(fecha) {
  if (!fecha) return null;
  const normalized = String(fecha).slice(0, 10);
  const parsed = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("La fecha es invalida.", 400, "VALIDATION_ERROR");
  }
  return `${normalized} 12:00:00`;
}

function addDays(baseDate, days) {
  const next = new Date(`${baseDate}T12:00:00`);
  next.setDate(next.getDate() + days);
  return formatISODate(next);
}

function serializarRecordatorioService(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    servicio: row.servicio,
    km_base: Number(row.km_base) || 0,
    km_proximo: Number(row.km_proximo) || 0,
    km_por_dia: Number(row.km_por_dia) || 0,
    dias_estimados: Number(row.dias_estimados) || 0,
    fecha_base: row.fecha_base ? String(row.fecha_base).slice(0, 10) : null,
    fecha_recordatorio: row.fecha_recordatorio ? String(row.fecha_recordatorio).slice(0, 10) : null,
    activo: Boolean(row.activo),
    enviado_at: row.enviado_at || null,
  };
}

async function ensureOrdenEditable(ordenId, trx = db) {
  const orden = await OrdenesRepository.findById(ordenId, trx);

  if (!orden) {
    throw new AppError("Trabajo no encontrado.", 404, "NOT_FOUND");
  }

  if (["cerrada", "cancelada"].includes(orden.estado)) {
    throw new AppError("No podés modificar un trabajo cerrado o cancelado.", 400, "ORDEN_LOCKED");
  }

  return orden;
}

const OrdenesService = {
  async listar(query) {
    const parsed = listOrdenesSchema.safeParse(query);

    if (!parsed.success) {
      throw new AppError("Parámetros inválidos.", 400, "VALIDATION_ERROR");
    }

    return OrdenesRepository.findAll(parsed.data);
  },

  async obtener(id) {
    const ordenId = parseId(id);
    const orden = await OrdenesRepository.findByIdCompleta(ordenId);

    if (!orden) {
      throw new AppError("Trabajo no encontrado.", 404, "NOT_FOUND");
    }

    const [historialVehiculo, recordatorioService] = await Promise.all([
      OrdenesRepository.findHistorialVehiculo(orden.vehiculo_id, 3, ordenId),
      db("ordenes_recordatorios_service").where({ orden_id: ordenId }).orderBy("id", "desc").first(),
    ]);

    return {
      ...orden,
      historial_vehiculo: historialVehiculo,
      recordatorio_service: serializarRecordatorioService(recordatorioService),
    };
  },

  async obtenerSaldo(id) {
    const ordenId = parseId(id);
    const saldo = await PagosRepository.getSaldoOrden(ordenId);

    if (!saldo) {
      throw new AppError("Trabajo no encontrado.", 404, "NOT_FOUND");
    }

    return saldo;
  },

  async crear(data, usuarioId) {
    const parsed = createOrdenSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos inválidos.", 400, "VALIDATION_ERROR");
    }

    const cliente = await ClientesRepository.findById(parsed.data.cliente_id);
    if (!cliente) {
      throw new AppError("El cliente no existe.", 404, "NOT_FOUND");
    }

    const vehiculo = await VehiculosRepository.findById(parsed.data.vehiculo_id);
    if (!vehiculo) {
      throw new AppError("El vehículo no existe.", 404, "NOT_FOUND");
    }

    if (vehiculo.cliente_id !== parsed.data.cliente_id) {
      throw new AppError("El vehículo no pertenece al cliente seleccionado.", 400, "VEHICULO_MISMATCH");
    }

    if ((parsed.data.adelanto || 0) > 0 && !(parsed.data.empleado_id || usuarioId)) {
      throw new AppError("No se pudo identificar al usuario que registra el adelanto.", 401, "UNAUTHORIZED");
    }

    let ordenId;

    await db.transaction(async (trx) => {
      const adelanto = parsed.data.adelanto || 0;
      const adelantoMetodo = adelanto > 0 ? parsed.data.adelanto_metodo || "efectivo" : null;

      const [createdId] = await trx("ordenes").insert({
        numero: null,
        cliente_id: parsed.data.cliente_id,
        vehiculo_id: parsed.data.vehiculo_id,
        empleado_id: parsed.data.empleado_id || usuarioId || null,
        km_entrada: parsed.data.km_entrada || 0,
        notas_cliente: parsed.data.notas_cliente || null,
        adelanto,
        adelanto_metodo: adelantoMetodo,
        ...(parsed.data.fecha_ingreso && { created_at: normalizarFechaMovimiento(parsed.data.fecha_ingreso) }),
      });

      const numero = await generarNumeroOrden(createdId, trx);

      await trx("ordenes").where({ id: createdId }).update({
        numero,
        updated_at: trx.fn.now(),
      });

      // Si hay adelanto, registrarlo como pago inmediato
      if (adelanto > 0) {
        await trx("pagos").insert({
          orden_id: createdId,
          monto: adelanto,
          metodo: adelantoMetodo,
          notas: "Adelanto al ingreso del vehículo",
          empleado_id: parsed.data.empleado_id || usuarioId,
          created_at: normalizarFechaMovimiento(parsed.data.fecha_ingreso) || trx.fn.now(),
        });

        await trx("ordenes").where({ id: createdId }).update({
          estado_pago: "pagado",
          updated_at: trx.fn.now(),
        });
      }

      ordenId = createdId;
    });

    return this.obtener(ordenId);
  },

  async actualizar(id, data) {
    const ordenId = parseId(id);
    const parsed = updateOrdenSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }

    await db.transaction(async (trx) => {
      const orden = await ensureOrdenEditable(ordenId, trx);
      const clienteId = parsed.data.cliente_id ?? orden.cliente_id;
      const vehiculoId = parsed.data.vehiculo_id ?? orden.vehiculo_id;

      if (parsed.data.cliente_id) {
        const cliente = await ClientesRepository.findById(parsed.data.cliente_id);
        if (!cliente) {
          throw new AppError("El cliente no existe.", 404, "NOT_FOUND");
        }
      }

      if (parsed.data.vehiculo_id || parsed.data.cliente_id) {
        const vehiculo = await VehiculosRepository.findById(vehiculoId);
        if (!vehiculo) {
          throw new AppError("El vehiculo no existe.", 404, "NOT_FOUND");
        }

        if (vehiculo.cliente_id !== clienteId) {
          throw new AppError("El vehiculo no pertenece al cliente seleccionado.", 400, "VEHICULO_MISMATCH");
        }
      }

      await trx("ordenes").where({ id: ordenId }).update({
        ...(parsed.data.cliente_id !== undefined && { cliente_id: parsed.data.cliente_id }),
        ...(parsed.data.vehiculo_id !== undefined && { vehiculo_id: parsed.data.vehiculo_id }),
        ...(parsed.data.km_entrada !== undefined && { km_entrada: parsed.data.km_entrada }),
        ...(parsed.data.notas_cliente !== undefined && { notas_cliente: parsed.data.notas_cliente || null }),
        ...(parsed.data.notas_mecanico !== undefined && { notas_mecanico: parsed.data.notas_mecanico || null }),
        ...(parsed.data.fecha_ingreso !== undefined && {
          created_at: normalizarFechaMovimiento(parsed.data.fecha_ingreso),
        }),
        updated_at: trx.fn.now(),
      });
    });

    return this.obtener(ordenId);
  },

  async agregarServicio(id, data) {
    const ordenId = parseId(id);
    const parsed = ordenServicioSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos inválidos.", 400, "VALIDATION_ERROR");
    }

    let servicioCreado = false;

    await db.transaction(async (trx) => {
      await ensureOrdenEditable(ordenId, trx);

      let servicioId = parsed.data.servicio_id;
      let servicioNombre;
      let precioBase;

      if (parsed.data.nombre_nuevo) {
        // Buscar o crear la categoría "General" para servicios
        let categoria = await trx("categorias").where({ nombre: "General", tipo: "servicio" }).first();
        if (!categoria) {
          const [catId] = await trx("categorias").insert({ nombre: "General", tipo: "servicio" });
          categoria = { id: catId };
        }

        const [newServicioId] = await trx("servicios").insert({
          categoria_id: categoria.id,
          nombre: parsed.data.nombre_nuevo,
          descripcion: null,
          precio_base: parsed.data.precio_unitario ?? 0,
          activo: 1,
        });

        servicioId = newServicioId;
        servicioNombre = parsed.data.nombre_nuevo;
        precioBase = parsed.data.precio_unitario ?? 0;
        servicioCreado = true;
      } else {
        const servicio = await trx("servicios").where({ id: servicioId, activo: 1 }).first();
        if (!servicio) {
          throw new AppError("Servicio no encontrado.", 404, "NOT_FOUND");
        }
        servicioNombre = servicio.nombre;
        precioBase = Number(servicio.precio_base);
      }

      const precioUnitario = parsed.data.precio_unitario ?? precioBase;
      const subtotal = Number(precioUnitario) * parsed.data.cantidad;

      await trx("orden_servicios").insert({
        orden_id: ordenId,
        servicio_id: servicioId,
        descripcion: parsed.data.descripcion || servicioNombre,
        cantidad: parsed.data.cantidad,
        precio_unitario: precioUnitario,
        subtotal,
      });

      await recalcularTotales(ordenId, trx);
    });

    const orden = await this.obtener(ordenId);
    return { orden, servicio_creado: servicioCreado };
  },

  async quitarServicio(id, itemId) {
    const ordenId = parseId(id);
    const servicioItemId = parseId(itemId);

    await db.transaction(async (trx) => {
      await ensureOrdenEditable(ordenId, trx);

      const item = await trx("orden_servicios").where({ id: servicioItemId, orden_id: ordenId }).first();

      if (!item) {
        throw new AppError("Item de servicio no encontrado.", 404, "NOT_FOUND");
      }

      await trx("orden_servicios").where({ id: servicioItemId }).del();
      await recalcularTotales(ordenId, trx);
    });

    return this.obtener(ordenId);
  },

  async agregarProducto(id, data, usuarioId) {
    const ordenId = parseId(id);
    const parsed = ordenProductoSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos inválidos.", 400, "VALIDATION_ERROR");
    }

    await db.transaction(async (trx) => {
      await ensureOrdenEditable(ordenId, trx);

      const producto = await trx("productos")
        .where({ id: parsed.data.producto_id, activo: 1 })
        .forUpdate()
        .first();

      if (!producto) {
        throw new AppError("Producto no encontrado.", 404, "NOT_FOUND");
      }

      const cantidad = Number(parsed.data.cantidad);
      const stockActual = Number(producto.stock_actual);

      if (stockActual < cantidad) {
        throw new AppError(
          `Stock insuficiente. Hay ${stockActual.toLocaleString("es-AR")} ${producto.unidad} disponibles.`,
          400,
          "INSUFFICIENT_STOCK"
        );
      }

      const precioUnitario = parsed.data.precio_unitario ?? Number(producto.precio_venta);
      const subtotal = Number(precioUnitario) * cantidad;
      const nuevoStock = stockActual - cantidad;

      await trx("orden_productos").insert({
        orden_id: ordenId,
        producto_id: parsed.data.producto_id,
        descripcion: parsed.data.descripcion || producto.nombre,
        cantidad,
        precio_unitario: precioUnitario,
        subtotal,
      });

      await trx("productos").where({ id: producto.id }).update({
        stock_actual: nuevoStock,
        updated_at: trx.fn.now(),
      });

      await trx("movimientos_stock").insert({
        producto_id: producto.id,
        tipo: "salida",
        cantidad,
        stock_anterior: stockActual,
        stock_nuevo: nuevoStock,
        referencia_tipo: "orden",
        referencia_id: ordenId,
        empleado_id: usuarioId || null,
      });

      await recalcularTotales(ordenId, trx);
    });

    return this.obtener(ordenId);
  },

  async agregarProductosBatch(id, data, usuarioId) {
    const ordenId = parseId(id);
    const parsed = batchProductosSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos inválidos.", 400, "VALIDATION_ERROR");
    }

    await db.transaction(async (trx) => {
      await ensureOrdenEditable(ordenId, trx);

      for (const item of parsed.data.items) {
        let productoId = item.producto_id;
        let productoNombre;
        let cantidad = Number(item.cantidad);

        if (item.nombre_nuevo) {
          // Buscar o crear la categoría "General" para productos
          let categoria = await trx("categorias").where({ nombre: "General", tipo: "producto" }).first();
          if (!categoria) {
            const [catId] = await trx("categorias").insert({ nombre: "General", tipo: "producto" });
            categoria = { id: catId };
          }

          // Crear el producto con stock suficiente para cubrir esta venta
          const [newProductoId] = await trx("productos").insert({
            categoria_id: categoria.id,
            nombre: item.nombre_nuevo,
            codigo: null,
            descripcion: null,
            precio_costo: 0,
            precio_venta: item.precio_unitario ?? 0,
            stock_actual: cantidad,
            stock_minimo: 0,
            unidad: "unidad",
            activo: 1,
          });

          productoId = newProductoId;
          productoNombre = item.nombre_nuevo;
        }

        const producto = await trx("productos")
          .where({ id: productoId, activo: 1 })
          .forUpdate()
          .first();

        if (!producto) {
          throw new AppError(`Producto #${productoId} no encontrado.`, 404, "NOT_FOUND");
        }

        productoNombre = productoNombre ?? producto.nombre;
        const stockActual = Number(producto.stock_actual);

        if (stockActual < cantidad) {
          throw new AppError(
            `Stock insuficiente para "${productoNombre}". Hay ${stockActual.toLocaleString("es-AR")} ${producto.unidad} disponibles.`,
            400,
            "INSUFFICIENT_STOCK"
          );
        }

        const precioUnitario = item.precio_unitario ?? Number(producto.precio_venta);
        const subtotal = Number(precioUnitario) * cantidad;
        const nuevoStock = stockActual - cantidad;

        await trx("orden_productos").insert({
          orden_id: ordenId,
          producto_id: productoId,
          descripcion: item.descripcion || productoNombre,
          cantidad,
          precio_unitario: precioUnitario,
          subtotal,
        });

        await trx("productos").where({ id: productoId }).update({
          stock_actual: nuevoStock,
          updated_at: trx.fn.now(),
        });

        await trx("movimientos_stock").insert({
          producto_id: productoId,
          tipo: "salida",
          cantidad,
          stock_anterior: stockActual,
          stock_nuevo: nuevoStock,
          referencia_tipo: "orden",
          referencia_id: ordenId,
          empleado_id: usuarioId || null,
        });
      }

      await recalcularTotales(ordenId, trx);
    });

    return this.obtener(ordenId);
  },

  async quitarProducto(id, itemId, usuarioId) {
    const ordenId = parseId(id);
    const productoItemId = parseId(itemId);

    await db.transaction(async (trx) => {
      await ensureOrdenEditable(ordenId, trx);

      const item = await trx("orden_productos").where({ id: productoItemId, orden_id: ordenId }).first();

      if (!item) {
        throw new AppError("Item de producto no encontrado.", 404, "NOT_FOUND");
      }

      const producto = await trx("productos").where({ id: item.producto_id }).forUpdate().first();

      if (!producto) {
        throw new AppError("Producto no encontrado.", 404, "NOT_FOUND");
      }

      const stockActual = Number(producto.stock_actual);
      const cantidad = Number(item.cantidad);
      const nuevoStock = stockActual + cantidad;

      await trx("orden_productos").where({ id: productoItemId }).del();

      await trx("productos").where({ id: producto.id }).update({
        stock_actual: nuevoStock,
        updated_at: trx.fn.now(),
      });

      await trx("movimientos_stock").insert({
        producto_id: producto.id,
        tipo: "entrada",
        cantidad,
        stock_anterior: stockActual,
        stock_nuevo: nuevoStock,
        referencia_tipo: "orden_devolucion",
        referencia_id: ordenId,
        empleado_id: usuarioId || null,
        notas: "Devolución por quitar item de orden",
      });

      await recalcularTotales(ordenId, trx);
    });

    return this.obtener(ordenId);
  },

  async cambiarEstado(id, data) {
    const ordenId = parseId(id);
    const parsed = estadoOrdenSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos inválidos.", 400, "VALIDATION_ERROR");
    }

    await db.transaction(async (trx) => {
      const orden = await OrdenesRepository.findById(ordenId, trx);

      if (!orden) {
        throw new AppError("Trabajo no encontrado.", 404, "NOT_FOUND");
      }

      if (!transiciones[orden.estado].includes(parsed.data.estado)) {
        throw new AppError(
          `No podés pasar un trabajo de "${orden.estado}" a "${parsed.data.estado}".`,
          400,
          "INVALID_TRANSITION"
        );
      }

      const payload = {
        estado: parsed.data.estado,
        updated_at: trx.fn.now(),
      };

      if (parsed.data.estado === "cerrada") {
        payload.closed_at = trx.fn.now();
        payload.estado_pago = Number(orden.total) <= 0 ? "pagado" : orden.estado_pago || "sin_pagar";
      }

      await trx("ordenes").where({ id: ordenId }).update(payload);

      if (parsed.data.estado === "cerrada" && Number(orden.km_entrada) > 0) {
        await trx("vehiculos").where({ id: orden.vehiculo_id }).update({
          km_ultimo_ingreso: orden.km_entrada,
          updated_at: trx.fn.now(),
        });
      }
    });

    if (parsed.data.estado === "cerrada") {
      WhatsAppService.notificarOrdenCerrada(ordenId).catch((error) => {
        logger.warn({ error: error.message, ordenId }, "La notificación de WhatsApp falló al cerrar la orden");
      });
    }

    return this.obtener(ordenId);
  },

  async actualizarNotas(id, data) {
    const ordenId = parseId(id);
    const parsed = notasOrdenSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos inválidos.", 400, "VALIDATION_ERROR");
    }

    await db.transaction(async (trx) => {
      await ensureOrdenEditable(ordenId, trx);

      await trx("ordenes").where({ id: ordenId }).update({
        ...(parsed.data.notas_cliente !== undefined && { notas_cliente: parsed.data.notas_cliente || null }),
        ...(parsed.data.notas_mecanico !== undefined && { notas_mecanico: parsed.data.notas_mecanico || null }),
        ...(parsed.data.km_entrada !== undefined && { km_entrada: parsed.data.km_entrada }),
        updated_at: trx.fn.now(),
      });
    });

    return this.obtener(ordenId);
  },

  async aplicarDescuento(id, data) {
    const ordenId = parseId(id);
    const parsed = descuentoOrdenSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos inválidos.", 400, "VALIDATION_ERROR");
    }

    await db.transaction(async (trx) => {
      const orden = await ensureOrdenEditable(ordenId, trx);

      if (parsed.data.descuento > Number(orden.subtotal)) {
        throw new AppError("El descuento no puede superar el subtotal.", 400, "DISCOUNT_EXCEEDS_SUBTOTAL");
      }

      await trx("ordenes").where({ id: ordenId }).update({
        descuento: parsed.data.descuento,
        updated_at: trx.fn.now(),
      });

      await recalcularTotales(ordenId, trx);
    });

    return this.obtener(ordenId);
  },

  async actualizarRecordatorioService(id, data) {
    const ordenId = parseId(id);
    const parsed = recordatorioServiceSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }

    await db.transaction(async (trx) => {
      const orden = await trx("ordenes").where({ id: ordenId }).first();

      if (!orden) {
        throw new AppError("Trabajo no encontrado.", 404, "NOT_FOUND");
      }

      if (orden.estado === "cancelada") {
        throw new AppError("No puedes programar recordatorios para una orden cancelada.", 400, "ORDEN_CANCELADA");
      }

      const servicio = parsed.data.servicio.trim();
      const servicioNormalizado = normalizarServicioRecordatorio(servicio);
      const kmBase = Number(parsed.data.km_base) || 0;
      const kmProximo = Number(parsed.data.km_proximo) || 0;
      const kmPorDia = Number(parsed.data.km_por_dia) || 0;

      if (kmProximo <= kmBase) {
        throw new AppError("El kilometraje objetivo debe ser mayor al kilometraje base.", 400, "VALIDATION_ERROR");
      }

      const diasEstimados = Math.ceil((kmProximo - kmBase) / kmPorDia);
      const fechaBase = orden.closed_at ? formatISODate(orden.closed_at) : formatISODate(new Date());
      const fechaRecordatorio = addDays(fechaBase, diasEstimados);
      const existente = await trx("ordenes_recordatorios_service").where({ orden_id: ordenId }).first();

      await trx("ordenes_recordatorios_service")
        .where({ vehiculo_id: orden.vehiculo_id, servicio_normalizado: servicioNormalizado, activo: 1 })
        .modify((queryBuilder) => {
          if (existente?.id) {
            queryBuilder.whereNot("id", existente.id);
          }
        })
        .update({
          activo: 0,
          updated_at: trx.fn.now(),
        });

      const payload = {
        orden_id: ordenId,
        vehiculo_id: orden.vehiculo_id,
        servicio,
        servicio_normalizado: servicioNormalizado,
        fecha_base: fechaBase,
        km_base: kmBase,
        km_proximo: kmProximo,
        km_por_dia: kmPorDia,
        dias_estimados: diasEstimados,
        fecha_recordatorio: fechaRecordatorio,
        activo: 1,
        enviado_at: null,
        updated_at: trx.fn.now(),
      };

      if (existente) {
        await trx("ordenes_recordatorios_service").where({ id: existente.id }).update(payload);
      } else {
        await trx("ordenes_recordatorios_service").insert(payload);
      }
    });

    return this.obtener(ordenId);
  },

  async eliminarRecordatorioService(id) {
    const ordenId = parseId(id);

    await db.transaction(async (trx) => {
      const orden = await trx("ordenes").where({ id: ordenId }).first();

      if (!orden) {
        throw new AppError("Trabajo no encontrado.", 404, "NOT_FOUND");
      }

      await trx("ordenes_recordatorios_service")
        .where({ orden_id: ordenId, activo: 1 })
        .update({
          activo: 0,
          updated_at: trx.fn.now(),
        });
    });

    return this.obtener(ordenId);
  },

  async eliminarCancelada(id, usuarioId) {
    const ordenId = parseId(id);

    await db.transaction(async (trx) => {
      const orden = await trx("ordenes").where({ id: ordenId }).forUpdate().first();

      if (!orden) {
        throw new AppError("Trabajo no encontrado.", 404, "NOT_FOUND");
      }

      if (orden.estado !== "cancelada") {
        throw new AppError("Solo se pueden eliminar ordenes canceladas.", 400, "ORDEN_NOT_CANCELLED");
      }

      const [{ total: pagosRegistrados }] = await trx("pagos")
        .where({ orden_id: ordenId })
        .count("id as total");

      if (Number(pagosRegistrados) > 0) {
        throw new AppError(
          "No se puede eliminar una orden cancelada con cobros registrados. Anula o revisa esos movimientos primero.",
          409,
          "ORDEN_HAS_PAYMENTS"
        );
      }

      const productos = await trx("orden_productos").where({ orden_id: ordenId });

      for (const item of productos) {
        const producto = await trx("productos").where({ id: item.producto_id }).forUpdate().first();
        if (!producto) {
          continue;
        }

        const stockAnterior = Number(producto.stock_actual);
        const cantidad = Number(item.cantidad);
        const stockNuevo = stockAnterior + cantidad;

        await trx("productos").where({ id: producto.id }).update({
          stock_actual: stockNuevo,
          updated_at: trx.fn.now(),
        });

        await trx("movimientos_stock").insert({
          producto_id: producto.id,
          tipo: "entrada",
          cantidad,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          referencia_tipo: "orden_eliminada",
          referencia_id: ordenId,
          empleado_id: usuarioId || null,
          notas: "Reposicion por eliminacion de orden cancelada",
        });
      }

      await trx("ordenes_recordatorios_service").where({ orden_id: ordenId }).del();
      await trx("remitos").where({ orden_id: ordenId }).del();
      await trx("orden_productos").where({ orden_id: ordenId }).del();
      await trx("orden_servicios").where({ orden_id: ordenId }).del();
      await trx("ordenes").where({ id: ordenId }).del();
    });
  },
};

module.exports = OrdenesService;
