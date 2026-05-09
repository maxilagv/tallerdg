import type { MetodoPago } from "../pagos/api";
import api from "../../shared/lib/axios";

export type PeriodoPago = "semana" | "quincena" | "mes";
export type EstadoPeriodo = "abierto" | "pagado";

export const periodoPagoLabel: Record<PeriodoPago, string> = {
  semana: "Semanal",
  quincena: "Quincenal",
  mes: "Mensual",
};

export interface SalarioConfig {
  id: number;
  empleado_id: number;
  sueldo_base: number;
  periodo_pago: PeriodoPago;
}

export interface Adelanto {
  id: number;
  periodo_id: number;
  empleado_id: number;
  monto: number;
  metodo_pago?: MetodoPago | null;
  fecha: string;
  descripcion?: string | null;
  gasto_id?: number | null;
  anulado_at?: string | null;
  motivo_anulacion?: string | null;
  created_at: string;
}

export interface PeriodoSueldo {
  id: number;
  empleado_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  sueldo_base: number;
  estado: EstadoPeriodo;
  pagado_at?: string | null;
  total_adelantos: number;
  adelantos?: Adelanto[];
}

export interface EmpleadoResumen {
  id: number;
  nombre: string;
  apellido: string;
  rol: string;
  config: SalarioConfig | null;
  periodo_actual: PeriodoSueldo | null;
}

export interface PeriodoHistorial extends PeriodoSueldo {
  total_adelantos: number;
}

export interface HistorialResponse {
  rows: PeriodoHistorial[];
  total: number;
  page: number;
  limit: number;
}

export interface AdelantoResult {
  adelanto: Adelanto;
  supera_saldo: boolean;
  saldo_disponible: number;
}

export const sueldosApi = {
  getResumen: () =>
    api.get<{ ok: boolean; data: EmpleadoResumen[] }>("/sueldos"),

  getConfig: (empleadoId: number) =>
    api.get<{ ok: boolean; data: SalarioConfig | null }>(`/sueldos/${empleadoId}/config`),

  upsertConfig: (empleadoId: number, payload: { sueldo_base: number; periodo_pago: PeriodoPago }) =>
    api.put<{ ok: boolean; data: SalarioConfig }>(`/sueldos/${empleadoId}/config`, payload),

  abrirPeriodo: (empleadoId: number, payload: { fecha_inicio: string }) =>
    api.post<{ ok: boolean; data: PeriodoSueldo }>(`/sueldos/${empleadoId}/periodos`, payload),

  actualizarPeriodo: (
    periodoId: number,
    payload: { fecha_inicio?: string; fecha_fin?: string; sueldo_base?: number }
  ) =>
    api.patch<{ ok: boolean; data: PeriodoSueldo }>(`/sueldos/periodos/${periodoId}`, payload),

  liquidar: (periodoId: number, payload?: { metodo_pago?: MetodoPago }) =>
    api.post<{ ok: boolean; data: { saldo_pagado: number; gasto_id: number | null } }>(
      `/sueldos/periodos/${periodoId}/liquidar`,
      payload
    ),

  registrarAdelanto: (
    periodoId: number,
    payload: { monto: number; fecha?: string; descripcion?: string; metodo_pago: MetodoPago }
  ) =>
    api.post<{ ok: boolean; data: AdelantoResult }>(
      `/sueldos/periodos/${periodoId}/adelantos`,
      payload
    ),

  anularAdelanto: (adelantoId: number, motivo: string) =>
    api.post<{ ok: boolean; data: Adelanto }>(`/sueldos/adelantos/${adelantoId}/anular`, { motivo }),

  getHistorial: (empleadoId: number, params?: Record<string, unknown>) =>
    api.get<{ ok: boolean; data: HistorialResponse }>(`/sueldos/${empleadoId}/historial`, { params }),
};
