import api from "../../shared/lib/axios";
import type { MetodoPago } from "../pagos/api";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — Resumen de Caja
// ─────────────────────────────────────────────────────────────────────────────

export interface FinanzasResumen {
  // Ingresos operativos
  ingresos:              number;
  cobros_ordenes:        number;
  abonos_deuda_total:    number;
  ventas_rapidas_total:  number;
  // Egresos operativos
  gastos:                number;
  compras:               number;
  compras_directas:      number;
  compras_a_cuenta:      number;
  pagos_proveedores:     number;
  egresos:               number;
  // Resultado operativo (sin movimientos del titular)
  resultado_neto:        number;
  // Movimientos del titular (NO operativos)
  aportes_titular:       number;
  retiros_titular:       number;
  aportes_titular_efectivo: number;
  retiros_titular_efectivo: number;
  neto_titular:          number;
  cantidad_movimientos_titular: number;
  // Saldo Real = resultado_neto + neto_titular (compatibilidad)
  saldo_real:            number;
  // Efectivo físico en caja (solo movimientos en efectivo + titular)
  cobros_efectivo:       number;
  abonos_deuda_efectivo: number;
  vr_efectivo:           number;
  gastos_efectivo:       number;
  pagos_proveedores_efectivo: number;
  caja_inicia_en_cero:    boolean;
  caja_reset_activo:      boolean;
  caja_reset_fecha:       string | null;
  caja_reset_at:          string | null;
  saldo_efectivo_inicial: number;
  saldo_efectivo_arrastre: number;
  saldo_efectivo:        number;
  // Estadísticas
  cantidad_ordenes:       number;
  cantidad_cobros:        number;
  cantidad_abonos_deuda:  number;
  cantidad_compras:       number;
  cantidad_compras_a_cuenta: number;
  cantidad_pagos_proveedores: number;
  cantidad_ventas_rapidas: number;
  deuda_proveedores_total: number;
  // Desgloses por método de pago
  desglose_metodos:    Array<{ metodo: MetodoPago; total: number }>;
  desglose_metodos_vr: Array<{ metodo: string;    total: number }>;
  desglose_metodos_deuda: Array<{ metodo: string; total: number }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — Por día / Categorías
// ─────────────────────────────────────────────────────────────────────────────

export interface PuntoFinanzasDia {
  dia:   string;
  total: number;
}

export interface GastoPorCategoria {
  categoria: string;
  total:     number;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — Movimientos históricos (panel mensual)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * subtipo discrimina el origen exacto del movimiento:
 *  cobro           → cobro de orden de trabajo
 *  abono_deuda     → abono de deuda manual
 *  venta_rapida    → venta en caja rápida
 *  gasto           → gasto operativo
 *  compra          → compra/pago a proveedor que impacta caja
 *  pago_proveedor  → pago de deuda de proveedor
 *  aporte_titular  → aporte del dueño (no operativo)
 *  retiro_titular  → retiro del dueño (no operativo)
 */
export type SubtipoMovimiento =
  | "cobro"
  | "abono_deuda"
  | "venta_rapida"
  | "gasto"
  | "compra"
  | "pago_proveedor"
  | "aporte_titular"
  | "retiro_titular";

export interface MovimientoFinanciero {
  tipo:         "ingreso" | "egreso";
  subtipo:      SubtipoMovimiento;
  referencia:   string;
  monto:        number;
  fecha:        string;
  fecha_hora?:  string;
  registrado_at?: string | null;
  descripcion:  string;
  /**
   * Método de pago del cobro o venta rápida.
   * Solo presente en subtipo "cobro" y "venta_rapida"; null para el resto.
   * Valores posibles para cobros: efectivo | tarjeta | transferencia | cheque | cuenta_corriente
   * Valores posibles para ventas rápidas: efectivo | tarjeta | transferencia | otro
   */
  metodo_cobro: string | null;
}

export interface MovimientosFinancierosResponse {
  rows:  MovimientoFinanciero[];
  total: number;
  page:  number;
  limit: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — Movimientos del Titular (CRUD)
// ─────────────────────────────────────────────────────────────────────────────

export type TipoMovimientoTitular = "aporte_titular" | "retiro_titular";

export interface MovimientoTitular {
  id:             number;
  tipo:           TipoMovimientoTitular;
  monto:          number;
  metodo_pago:    "efectivo" | "transferencia";
  concepto:       string;
  referencia:     string | null;
  fecha:          string;
  notas:          string | null;
  empleado_id:    number | null;
  empleado_nombre: string | null;
  activo:         number;
  created_at:     string;
  updated_at:     string;
}

export interface MovimientoTitularPayload {
  tipo:       TipoMovimientoTitular;
  monto:      number;
  metodo_pago?: "efectivo" | "transferencia";
  concepto:   string;
  referencia?: string | null;
  fecha:      string;
  notas?:     string | null;
}

export interface CajaResetStatus {
  usado:          boolean;
  puede_resetear: boolean;
  fecha:          string | null;
  reset_at:       string | null;
  empleado_id:    number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — Análisis Inteligente
// ─────────────────────────────────────────────────────────────────────────────

export type NivelAlerta = "ok" | "info" | "warning" | "danger";

export interface AlertaCaja {
  nivel:   NivelAlerta;
  mensaje: string;
}

export type TendenciaCaja = "subiendo" | "bajando" | "estable";

export interface AnalisisCaja {
  dias_con_actividad:     number;
  dias_positivos:         number;
  dias_abastecimiento:    number;
  dias_perdida_operativa: number;
  promedio_ingreso_diario: number;
  mejor_dia: { fecha: string; ingresos: number; gastos: number; compras: number; neto: number } | null;
  peor_dia_operativo: { fecha: string; ingresos: number; gastos: number; compras: number; neto: number } | null;
  tendencia:    TendenciaCaja;
  categoria_mayor: { nombre: string; total: number; porcentaje: number } | null;
  pct_ventas_rapidas: number;
  alertas:      AlertaCaja[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API CLIENT
// Nota: las rutas del backend siguen siendo /finanzas/... para compatibilidad.
// El renombre a "Caja" es cosmético en la UI.
// ─────────────────────────────────────────────────────────────────────────────

export const finanzasApi = {
  // Reportes
  resumen: (params: { desde: string; hasta: string; caja_inicia_en_cero?: boolean }) =>
    api.get<{ ok: boolean; data: FinanzasResumen }>("/finanzas/resumen", { params }),

  porDia: (params: { desde: string; hasta: string }) =>
    api.get<{ ok: boolean; data: { ingresos: PuntoFinanzasDia[]; gastos: PuntoFinanzasDia[]; compras: PuntoFinanzasDia[] } }>("/finanzas/por-dia", { params }),

  movimientosMes: (params: { mes: number; anio: number }) =>
    api.get<{ ok: boolean; data: MovimientoFinanciero[] }>("/finanzas/movimientos-mes", { params }),

  gastosPorCategoria: (params: { desde: string; hasta: string }) =>
    api.get<{ ok: boolean; data: GastoPorCategoria[] }>("/finanzas/gastos-por-categoria", { params }),

  movimientos: (params: { desde: string; hasta: string; page?: number; limit?: number }) =>
    api.get<{ ok: boolean; data: MovimientosFinancierosResponse }>("/finanzas/movimientos", { params }),

  movimientosDetalle: (params: { desde: string; hasta: string }) =>
    api.get<{ ok: boolean; data: MovimientoFinanciero[] }>("/finanzas/movimientos-detalle", { params }),

  // Análisis inteligente
  analisis: (params: { desde: string; hasta: string }) =>
    api.get<{ ok: boolean; data: AnalisisCaja }>("/finanzas/analisis", { params }),

  resetCajaEstado: () =>
    api.get<{ ok: boolean; data: CajaResetStatus }>("/finanzas/reset-caja"),

  resetCaja: (payload: { fecha: string }) =>
    api.post<{ ok: boolean; data: CajaResetStatus }>("/finanzas/reset-caja", payload),

  // Movimientos del Titular
  movimientosTitular: (params?: { desde?: string; hasta?: string; page?: number; limit?: number }) =>
    api.get<{ ok: boolean; data: { rows: MovimientoTitular[]; total: number; page: number; limit: number } }>("/finanzas/movimientos-titular", { params }),

  crearMovimientoTitular: (
    payload: MovimientoTitularPayload,
    ownerAuthorizationToken?: string | null
  ) =>
    api.post<{ ok: boolean; data: MovimientoTitular }>(
      "/finanzas/movimientos-titular",
      payload,
      ownerAuthorizationToken
        ? { headers: { "X-Owner-Authorization": ownerAuthorizationToken } }
        : undefined
    ),

  actualizarMovimientoTitular: (
    id: number,
    payload: Partial<MovimientoTitularPayload>,
    ownerAuthorizationToken?: string | null
  ) =>
    api.put<{ ok: boolean; data: MovimientoTitular }>(
      `/finanzas/movimientos-titular/${id}`,
      payload,
      ownerAuthorizationToken
        ? { headers: { "X-Owner-Authorization": ownerAuthorizationToken } }
        : undefined
    ),

  eliminarMovimientoTitular: (
    id: number,
    ownerAuthorizationToken?: string | null
  ) =>
    api.delete<{ ok: boolean }>(`/finanzas/movimientos-titular/${id}`, {
      headers: ownerAuthorizationToken
        ? { "X-Owner-Authorization": ownerAuthorizationToken }
        : undefined,
    }),

  // Export Excel
  exportarExcel: async (params: { desde: string; hasta: string; caja_inicia_en_cero?: boolean }) => {
    const response = await api.get("/finanzas/exportar", { params, responseType: "blob" });
    const url  = URL.createObjectURL(response.data as Blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `caja_${params.desde}_${params.hasta}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  },
};
