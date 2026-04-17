import api from "../../shared/lib/axios";
import type { EstadoPago } from "../pagos/api";

export interface ClienteVehiculo {
  id: number;
  patente: string;
  marca: string;
  modelo: string;
  anio?: number | null;
  color?: string | null;
  tipo_combustible?: string | null;
  km_ultimo_ingreso?: number;
}

export interface Cliente {
  id: number;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  notas?: string | null;
  created_at: string;
  total_vehiculos?: number;
  vehiculos?: ClienteVehiculo[];
}

export interface ClienteDeudaOrden {
  id: number;
  numero: string;
  total: number;
  total_pagado: number;
  saldo_pendiente: number;
  cantidad_pagos: number;
  estado_pago: EstadoPago;
  closed_at?: string | null;
}

export interface ClienteDeudaResponse {
  cliente_id: number;
  cliente: {
    nombre: string;
    apellido: string;
  };
  total_deuda: number;
  ordenes: ClienteDeudaOrden[];
}

export interface ClientesListResponse {
  rows: Cliente[];
  total: number;
  page: number;
  limit: number;
}

export interface RegistroExpressPayload {
  nombre: string;
  apellido: string;
  telefono?: string;
  email?: string;
  patente: string;
  marca: string;
  modelo: string;
  anio?: number;
  color?: string;
  tipo_combustible?: string;
  km_actual?: number;
}

export interface RegistroExpressWarning {
  tipo: "TELEFONO_DUPLICADO";
  cliente_id: number;
  cliente_nombre: string;
}

export interface RegistroExpressResponse {
  cliente: Cliente;
  vehiculo: ClienteVehiculo & { id: number };
  warning: RegistroExpressWarning | null;
}

export const clientesApi = {
  listar: (params?: Record<string, unknown>) =>
    api.get<{ ok: boolean; data: ClientesListResponse }>("/clientes", { params }),
  obtener: (id: number) => api.get<{ ok: boolean; data: Cliente }>(`/clientes/${id}`),
  deuda: (id: number) => api.get<{ ok: boolean; data: ClienteDeudaResponse }>(`/clientes/${id}/deuda`),
  crear: (payload: Partial<Cliente>) =>
    api.post<{ ok: boolean; data: Cliente }>("/clientes", payload),
  actualizar: (id: number, payload: Partial<Cliente>) =>
    api.put<{ ok: boolean; data: Cliente }>(`/clientes/${id}`, payload),
  eliminar: (id: number) => api.delete<{ ok: boolean; message: string }>(`/clientes/${id}`),
  registroExpress: (payload: RegistroExpressPayload) =>
    api.post<{ ok: boolean; data: RegistroExpressResponse }>("/clientes/registro-express", payload),
};
