const db = require("../../shared/db/knex");

function normalizarImporte(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
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

async function recalcularTotales(ordenId, trx = db) {
  const [{ sum_servicios }] = await trx("orden_servicios")
    .where("orden_id", ordenId)
    .sum("subtotal as sum_servicios");

  const [{ sum_productos }] = await trx("orden_productos")
    .where("orden_id", ordenId)
    .sum("subtotal as sum_productos");

  const orden = await trx("ordenes").where({ id: ordenId }).select("descuento", "iva_porcentaje").first();
  const [{ total_pagado }] = await trx("pagos")
    .where({ orden_id: ordenId })
    .whereNull("anulado_at")
    .sum("monto as total_pagado");

  const subtotal = (Number(sum_servicios) || 0) + (Number(sum_productos) || 0);
  const descuento = Number(orden?.descuento) || 0;
  const base = Math.max(0, subtotal - descuento);
  const iva_porcentaje = Number(orden?.iva_porcentaje) || 0;
  const iva_monto = normalizarImporte(base * (iva_porcentaje / 100));
  const total = normalizarImporte(base + iva_monto);
  const estado_pago = resolverEstadoPago(total, total_pagado);

  await trx("ordenes").where({ id: ordenId }).update({
    subtotal,
    iva_monto,
    total,
    estado_pago,
    updated_at: trx.fn.now(),
  });
}

module.exports = { recalcularTotales };
