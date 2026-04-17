const { z } = require("zod");
const AppError = require("../../shared/errors/AppError");
const ClientesRepository = require("../clientes/clientes.repository");
const DeudasRepository = require("./deudas.repository");
const PagosRepository = require("../pagos/pagos.repository");
const {
  listDeudasSchema,
  createDeudaSchema,
  updateDeudaSchema,
  abonarDeudaSchema,
} = require("./deudas.validation");

const idSchema = z.coerce.number().int().positive();

function parseId(value) {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) throw new AppError("Identificador inválido.", 400, "VALIDATION_ERROR");
  return parsed.data;
}

const DeudasService = {
  async listar(query) {
    const parsed = listDeudasSchema.safeParse(query);
    if (!parsed.success) throw new AppError("Parámetros inválidos.", 400, "VALIDATION_ERROR");
    
    const data = await DeudasRepository.findAll(parsed.data);
    data.rows = data.rows.map(r => ({ ...r, tipo: "manual" }));

    if (parsed.data.cliente_id) {
      const deudaOrdenes = await PagosRepository.getDeudaCliente(parsed.data.cliente_id);
      
      let ordenRows = deudaOrdenes.ordenes.map(o => ({
        id: o.id,
        tipo: "orden",
        cliente_id: parsed.data.cliente_id,
        concepto: `Orden #${o.numero}`,
        monto_original: o.total,
        monto_pagado: o.total_pagado,
        saldo: o.saldo_pendiente,
        fecha: o.closed_at ? new Date(o.closed_at).toISOString().split("T")[0] : null,
        estado: o.estado_pago === "pago_parcial" ? "parcial" : "pendiente",
        referencia: o.numero,
        created_at: o.closed_at,
        notas: null
      }));

      if (parsed.data.q) {
        const q = parsed.data.q.toLowerCase();
        ordenRows = ordenRows.filter(o => o.concepto.toLowerCase().includes(q));
      }

      data.rows = [...data.rows, ...ordenRows];
      data.rows.sort((a, b) => new Date(b.created_at || b.fecha) - new Date(a.created_at || a.fecha));

      data.total += ordenRows.length;
      data.total_pendiente += deudaOrdenes.total_deuda;
      data.cantidad_pendiente += ordenRows.length;
    }

    return data;
  },

  async obtener(id) {
    const deudaId = parseId(id);
    const deuda = await DeudasRepository.findById(deudaId);
    if (!deuda) throw new AppError("Deuda no encontrada.", 404, "NOT_FOUND");
    return deuda;
  },

  async crear(data, usuarioId) {
    const parsed = createDeudaSchema.safeParse(data);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos inválidos.", 400, "VALIDATION_ERROR");
    }

    const cliente = await ClientesRepository.findById(parsed.data.cliente_id);
    if (!cliente) throw new AppError("El cliente no existe.", 404, "NOT_FOUND");

    return DeudasRepository.create({
      ...parsed.data,
      notas: parsed.data.notas || null,
      estado: "pendiente",
      monto_pagado: 0,
      empleado_id: usuarioId || null,
    });
  },

  async actualizar(id, data) {
    const deudaId = parseId(id);
    const parsed = updateDeudaSchema.safeParse(data);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos inválidos.", 400, "VALIDATION_ERROR");
    }

    const deuda = await DeudasRepository.findById(deudaId);
    if (!deuda) throw new AppError("Deuda no encontrada.", 404, "NOT_FOUND");
    if (deuda.estado === "pagada") throw new AppError("No podés modificar una deuda ya pagada.", 400, "DEUDA_PAGADA");

    return DeudasRepository.update(deudaId, parsed.data);
  },

  async abonar(id, data) {
    const deudaId = parseId(id);
    const parsed = abonarDeudaSchema.safeParse(data);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos inválidos.", 400, "VALIDATION_ERROR");
    }

    const deuda = await DeudasRepository.findById(deudaId);
    if (!deuda) throw new AppError("Deuda no encontrada.", 404, "NOT_FOUND");
    if (deuda.estado === "pagada") throw new AppError("Esta deuda ya está pagada.", 400, "DEUDA_PAGADA");

    const saldoActual = Number(deuda.monto_original) - Number(deuda.monto_pagado);
    if (parsed.data.monto > saldoActual) {
      throw new AppError(
        `El abono ($${parsed.data.monto}) supera el saldo pendiente ($${saldoActual.toFixed(2)}).`,
        400,
        "ABONO_EXCEDE_SALDO"
      );
    }

    return DeudasRepository.abonar(deudaId, parsed.data.monto);
  },

  async eliminar(id) {
    const deudaId = parseId(id);
    const deuda = await DeudasRepository.findById(deudaId);
    if (!deuda) throw new AppError("Deuda no encontrada.", 404, "NOT_FOUND");
    await DeudasRepository.softDelete(deudaId);
  },

  async resumenPorCliente() {
    const { clientes: manuales } = await DeudasRepository.getResumenPorCliente();
    const ordenes = await PagosRepository.getResumenDeudasOrdenes();

    const clientesMap = new Map();

    for (const r of manuales) {
      clientesMap.set(r.cliente_id, {
        ...r,
        cantidad_deudas: Number(r.cantidad_deudas),
        total_deuda: Number(r.total_deuda),
      });
    }

    for (const o of ordenes) {
      if (clientesMap.has(o.cliente_id)) {
        const c = clientesMap.get(o.cliente_id);
        c.cantidad_deudas += Number(o.cantidad_deudas);
        c.total_deuda += Number(o.total_deuda);
      } else {
        clientesMap.set(o.cliente_id, {
          cliente_id: o.cliente_id,
          cliente_nombre: o.cliente_nombre,
          cliente_apellido: o.cliente_apellido,
          cliente_telefono: o.cliente_telefono,
          cantidad_deudas: Number(o.cantidad_deudas),
          total_deuda: Number(o.total_deuda),
        });
      }
    }

    const mergedClientes = Array.from(clientesMap.values());
    mergedClientes.sort((a, b) => b.total_deuda - a.total_deuda);
    const totalGeneral = mergedClientes.reduce((acc, c) => acc + c.total_deuda, 0);

    return { clientes: mergedClientes, total_general: totalGeneral };
  },
};

module.exports = DeudasService;
