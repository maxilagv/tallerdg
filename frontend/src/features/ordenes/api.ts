import api from "../../shared/lib/axios";
import type { EstadoPago, Pago } from "../pagos/api";

export interface OrdenServicioItem {
  id: number;
  servicio_id: number;
  servicio_nombre: string;
  descripcion?: string | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface OrdenProductoItem {
  id: number;
  producto_id: number;
  producto_nombre: string;
  descripcion?: string | null;
  codigo?: string | null;
  unidad?: string | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface OrdenHistorialVehiculo {
  id: number;
  numero: string;
  total: number;
  km_entrada: number;
  closed_at: string | null;
  notas_mecanico?: string | null;
}

export interface OrdenRecordatorioService {
  id: number;
  servicio: string;
  km_base: number;
  km_proximo: number;
  km_por_dia: number;
  dias_estimados: number;
  fecha_base: string;
  fecha_recordatorio: string;
  activo: boolean;
  enviado_at?: string | null;
}

export interface Orden {
  id: number;
  numero: string;
  estado: "abierta" | "en_proceso" | "lista" | "cerrada" | "cancelada";
  estado_pago: EstadoPago;
  cliente_id: number;
  cliente_nombre: string;
  cliente_apellido: string;
  cliente_telefono?: string | null;
  vehiculo_id: number;
  patente: string;
  marca: string;
  modelo: string;
  anio?: number | null;
  tipo_combustible?: string | null;
  empleado_id?: number | null;
  empleado_nombre?: string | null;
  km_entrada: number;
  subtotal: number;
  descuento: number;
  adelanto: number;
  adelanto_metodo?: string | null;
  total: number;
  total_pagado: number;
  saldo_pendiente: number;
  cantidad_pagos: number;
  notas_cliente?: string | null;
  notas_mecanico?: string | null;
  created_at: string;
  closed_at?: string | null;
  remito_numero?: string | null;
  servicios: OrdenServicioItem[];
  productos: OrdenProductoItem[];
  pagos?: Pago[];
  historial_vehiculo?: OrdenHistorialVehiculo[];
  recordatorio_service?: OrdenRecordatorioService | null;
}

export interface OrdenSaldo {
  id: number;
  numero: string;
  estado: Orden["estado"];
  estado_pago: EstadoPago;
  total: number;
  cliente_id: number;
  total_pagado: number;
  cantidad_pagos: number;
  saldo_pendiente: number;
}

export interface OrdenesListResponse {
  rows: Orden[];
  total: number;
  page: number;
  limit: number;
}

export const ordenesApi = {
  listar: (params?: Record<string, unknown>) =>
    api.get<{ ok: boolean; data: OrdenesListResponse }>("/ordenes", { params }),
  obtener: (id: number) => api.get<{ ok: boolean; data: Orden }>(`/ordenes/${id}`),
  crear: (payload: Record<string, unknown>) => api.post<{ ok: boolean; data: Orden }>("/ordenes", payload),
  actualizar: (id: number, payload: Record<string, unknown>) =>
    api.put<{ ok: boolean; data: Orden }>(`/ordenes/${id}`, payload),
  eliminar: (id: number) =>
    api.delete<{ ok: boolean; message: string }>(`/ordenes/${id}`),
  obtenerSaldo: (id: number) => api.get<{ ok: boolean; data: OrdenSaldo }>(`/ordenes/${id}/saldo`),
  actualizarNotas: (id: number, payload: Record<string, unknown>) =>
    api.put<{ ok: boolean; data: Orden }>(`/ordenes/${id}/notas`, payload),
  cambiarEstado: (id: number, estado: Orden["estado"]) =>
    api.put<{ ok: boolean; data: Orden }>(`/ordenes/${id}/estado`, { estado }),
  aplicarDescuento: (id: number, descuento: number) =>
    api.put<{ ok: boolean; data: Orden }>(`/ordenes/${id}/descuento`, { descuento }),
  actualizarRecordatorioService: (
    id: number,
    payload: { servicio: string; km_base: number; km_proximo: number; km_por_dia: number }
  ) => api.put<{ ok: boolean; data: Orden }>(`/ordenes/${id}/recordatorio-service`, payload),
  eliminarRecordatorioService: (id: number) =>
    api.delete<{ ok: boolean; data: Orden }>(`/ordenes/${id}/recordatorio-service`),
  agregarServicio: (id: number, payload: Record<string, unknown>) =>
    api.post<{ ok: boolean; data: Orden; servicio_creado: boolean }>(`/ordenes/${id}/servicios`, payload),
  quitarServicio: (id: number, itemId: number) =>
    api.delete<{ ok: boolean; data: Orden }>(`/ordenes/${id}/servicios/${itemId}`),
  agregarProducto: (id: number, payload: Record<string, unknown>) =>
    api.post<{ ok: boolean; data: Orden }>(`/ordenes/${id}/productos`, payload),
  agregarProductosBatch: (
    id: number,
    items: Array<
      | { producto_id: number; cantidad: number; precio_unitario: number }
      | { nombre_nuevo: string; cantidad: number; precio_unitario: number }
    >
  ) => api.post<{ ok: boolean; data: Orden }>(`/ordenes/${id}/productos/batch`, { items }),
  quitarProducto: (id: number, itemId: number) =>
    api.delete<{ ok: boolean; data: Orden }>(`/ordenes/${id}/productos/${itemId}`),
  imprimirOrdenTrabajo: (id: number) =>
    api.get<Blob>(`/ordenes/${id}/orden-trabajo/pdf`, { responseType: "blob" }),
  descargarRemito: (id: number) =>
    api.get<Blob>(`/ordenes/${id}/remito/pdf`, { responseType: "blob" }),
};
