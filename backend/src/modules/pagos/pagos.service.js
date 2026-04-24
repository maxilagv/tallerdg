const XLSX = require("xlsx");
const { z } = require("zod");
const db = require("../../shared/db/knex");
const AppError = require("../../shared/errors/AppError");
const OrdenesRepository = require("../ordenes/ordenes.repository");
const PagosRepository = require("./pagos.repository");
const {
  createPagoSchema,
  listPagosSchema,
  exportPagosSchema,
  cancelPagoSchema,
} = require("./pagos.validation");

const idSchema = z.coerce.number().int().positive();

function parseId(value) {
  const parsed = idSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError("Identificador invalido.", 400, "VALIDATION_ERROR");
  }

  return parsed.data;
}

function normalizarImporte(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function normalizarFechaMovimiento(fecha) {
  if (!fecha) return null;
  const normalized = String(fecha).slice(0, 10);
  const parsed = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("La fecha del movimiento es invalida.", 400, "VALIDATION_ERROR");
  }
  return `${normalized} 12:00:00`;
}

function resolverEstadoPago(total, totalPagado) {
  if (normalizarImporte(total) <= 0) {
    return "pagado";
  }

  if (normalizarImporte(totalPagado) >= normalizarImporte(total)) {
    return "pagado";
  }

  if (normalizarImporte(totalPagado) > 0) {
    return "pago_parcial";
  }

  return "sin_pagar";
}

async function sincronizarEstadoPago(ordenId, trx) {
  const saldo = await PagosRepository.getSaldoOrden(ordenId, trx);

  if (!saldo) {
    throw new AppError("Trabajo no encontrado.", 404, "NOT_FOUND");
  }

  const estadoPago = resolverEstadoPago(saldo.total, saldo.total_pagado);

  await trx("ordenes").where({ id: ordenId }).update({
    estado_pago: estadoPago,
    updated_at: trx.fn.now(),
  });

  return {
    ...saldo,
    estado_pago: estadoPago,
  };
}

function crearWorkbookCobros(rows, resumen) {
  const workbook = XLSX.utils.book_new();

  const sheetCobros = XLSX.utils.json_to_sheet(
    rows.map((row) => ({
      Fecha: new Date(row.created_at).toLocaleDateString("es-AR"),
      Hora: new Date(row.created_at).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      Orden: row.orden_numero,
      Cliente: `${row.cliente_apellido}, ${row.cliente_nombre}`,
      Patente: row.patente,
      Metodo: row.metodo,
      Monto: Number(row.monto) || 0,
      Referencia: row.referencia || "",
      RegistradoPor: row.empleado_nombre || "",
      Estado: row.estado,
      MotivoAnulacion: row.motivo_anulacion || "",
      Notas: row.notas || "",
    }))
  );

  const resumenRows = [
    { Concepto: "Total cobrado", Valor: resumen.total_cobrado },
    { Concepto: "Cantidad de cobros", Valor: resumen.cantidad_cobros },
    { Concepto: "Cantidad de ordenes", Valor: resumen.cantidad_ordenes },
    ...resumen.totales_por_metodo.map((item) => ({
      Concepto: `Total ${item.metodo}`,
      Valor: item.total,
    })),
  ];
  const sheetResumen = XLSX.utils.json_to_sheet(resumenRows);

  XLSX.utils.book_append_sheet(workbook, sheetResumen, "Resumen");
  XLSX.utils.book_append_sheet(workbook, sheetCobros, "Cobros");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

const PagosService = {
  async listar(query) {
    const parsed = listPagosSchema.safeParse(query);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Parametros invalidos.", 400, "VALIDATION_ERROR");
    }

    return PagosRepository.findAll(parsed.data);
  },

  async crear(data, usuarioId) {
    const parsed = createPagoSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }

    if (!usuarioId) {
      throw new AppError("No se pudo identificar al usuario que registra el cobro.", 401, "UNAUTHORIZED");
    }

    await db.transaction(async (trx) => {
      const orden = await trx("ordenes").where({ id: parsed.data.orden_id }).forUpdate().first();

      if (!orden) {
        throw new AppError("Trabajo no encontrado.", 404, "NOT_FOUND");
      }

      if (orden.estado === "cancelada") {
        throw new AppError(
          "No se pueden registrar adelantos o cobros sobre trabajos cancelados.",
          400,
          "ORDEN_CANCELLED"
        );
      }

      const totalPagado = await PagosRepository.sumActivosByOrdenId(parsed.data.orden_id, trx);
      const saldoPendiente = normalizarImporte(Number(orden.total) - totalPagado);

      if (orden.estado === "cerrada") {
        if (saldoPendiente <= 0) {
          throw new AppError("La orden ya se encuentra totalmente pagada.", 409, "ORDEN_ALREADY_PAID");
        }

        if (normalizarImporte(parsed.data.monto) > saldoPendiente) {
          throw new AppError(
            `El pago supera el saldo pendiente de ${saldoPendiente.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}.`,
            400,
            "PAYMENT_EXCEEDS_BALANCE"
          );
        }
      }

      await PagosRepository.create(
        {
          orden_id: parsed.data.orden_id,
          monto: normalizarImporte(parsed.data.monto),
          metodo: parsed.data.metodo,
          created_at: normalizarFechaMovimiento(parsed.data.fecha) || trx.fn.now(),
          referencia: parsed.data.referencia || null,
          notas: parsed.data.notas || null,
          empleado_id: usuarioId,
        },
        trx
      );

      await sincronizarEstadoPago(parsed.data.orden_id, trx);
    });

    return OrdenesRepository.findByIdCompleta(parsed.data.orden_id);
  },

  async anular(id, data, usuarioId) {
    const pagoId = parseId(id);
    const parsed = cancelPagoSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }

    if (!usuarioId) {
      throw new AppError("No se pudo identificar al usuario que anula el cobro.", 401, "UNAUTHORIZED");
    }

    await db.transaction(async (trx) => {
      const pago = await PagosRepository.findByIdForUpdate(pagoId, trx);

      if (!pago) {
        throw new AppError("Cobro no encontrado.", 404, "NOT_FOUND");
      }

      if (pago.anulado_at) {
        throw new AppError("El cobro ya fue anulado.", 409, "PAYMENT_ALREADY_CANCELLED");
      }

      await trx("ordenes").where({ id: pago.orden_id }).forUpdate().first();

      await PagosRepository.cancelar(
        pagoId,
        {
          anulado_por: usuarioId,
          motivo_anulacion: parsed.data.motivo,
        },
        trx
      );

      await sincronizarEstadoPago(pago.orden_id, trx);
    });

    return PagosRepository.findById(pagoId);
  },

  async obtenerSaldoOrden(id) {
    const ordenId = parseId(id);
    const saldo = await PagosRepository.getSaldoOrden(ordenId);

    if (!saldo) {
      throw new AppError("Trabajo no encontrado.", 404, "NOT_FOUND");
    }

    return saldo;
  },

  async exportarExcel(query) {
    const parsed = exportPagosSchema.safeParse({
      ...query,
      page: query.page || 1,
      limit: query.limit || 5000,
    });

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Parametros invalidos.", 400, "VALIDATION_ERROR");
    }

    const [rows, listado] = await Promise.all([
      PagosRepository.findAllForExport(parsed.data),
      PagosRepository.findAll(parsed.data),
    ]);

    const buffer = crearWorkbookCobros(rows, listado.resumen);
    const desde = parsed.data.desde || "historico";
    const hasta = parsed.data.hasta || "actual";

    return {
      buffer,
      filename: `cobros-${desde}-${hasta}.xlsx`,
    };
  },
};

module.exports = PagosService;
