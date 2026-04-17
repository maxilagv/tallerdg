import api from "../../shared/lib/axios";

export interface Deuda {
  id: number;
  cliente_id: number;
  cliente_nombre: string;
  cliente_apellido: string;
  cliente_telefono?: string | null;
  concepto: string;
  monto_original: number;
  monto_pagado: number;
  saldo: number;
  fecha: string;
  estado: "pendiente" | "parcial" | "pagada";
  notas?: string | null;
  empleado_nombre?: string | null;
  created_at: string;
  tipo?: "manual" | "orden";
  referencia?: string | number;
}

export interface DeudasListResponse {
  rows: Deuda[];
  total: number;
  page: number;
  limit: number;
  total_pendiente: number;
  cantidad_pendiente: number;
}

export interface ResumenPorClienteItem {
  cliente_id: number;
  cliente_nombre: string;
  cliente_apellido: string;
  cliente_telefono?: string | null;
  cantidad_deudas: number;
  total_deuda: number;
}

export interface ResumenPorCliente {
  clientes: ResumenPorClienteItem[];
  total_general: number;
}

export const deudasApi = {
  listar: (params?: Record<string, unknown>) =>
    api.get<{ ok: boolean; data: DeudasListResponse }>("/deudas", { params }),

  resumenPorCliente: () =>
    api.get<{ ok: boolean; data: ResumenPorCliente }>("/deudas/resumen-clientes"),

  obtener: (id: number) =>
    api.get<{ ok: boolean; data: Deuda }>(`/deudas/${id}`),

  crear: (payload: {
    cliente_id: number;
    concepto: string;
    monto_original: number;
    fecha: string;
    notas?: string | null;
  }) => api.post<{ ok: boolean; data: Deuda }>("/deudas", payload),

  actualizar: (id: number, payload: Partial<{ concepto: string; monto_original: number; fecha: string; notas: string | null }>) =>
    api.patch<{ ok: boolean; data: Deuda }>(`/deudas/${id}`, payload),

  abonar: (id: number, monto: number, notas?: string | null) =>
    api.post<{ ok: boolean; data: Deuda }>(`/deudas/${id}/abonar`, { monto, notas }),

  eliminar: (id: number) =>
    api.delete<{ ok: boolean }>(`/deudas/${id}`),
};
