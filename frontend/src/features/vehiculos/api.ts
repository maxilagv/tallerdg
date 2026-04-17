import api from "../../shared/lib/axios";

export interface Vehiculo {
  id: number;
  cliente_id: number;
  patente: string;
  marca: string;
  modelo: string;
  anio?: number | null;
  color?: string | null;
  tipo_combustible: string;
  numero_motor?: string | null;
  numero_chasis?: string | null;
  km_ultimo_service?: number;
  km_ultimo_ingreso?: number;
  observaciones?: string | null;
  cliente_nombre: string;
  cliente_apellido: string;
  cliente_telefono?: string | null;
  historial?: Array<{
    id: number;
    numero: string;
    km_entrada: number;
    total: number;
    created_at: string;
    closed_at?: string | null;
    notas_mecanico?: string | null;
    servicios?: Array<{
      id: number;
      descripcion?: string | null;
      subtotal: number;
      servicio_nombre: string;
    }>;
    productos?: Array<{
      id: number;
      descripcion?: string | null;
      subtotal: number;
      producto_nombre: string;
    }>;
  }>;
  stats?: {
    total_visitas: number;
    total_facturado: number;
    ultima_visita: string | null;
  };
}

export interface VehiculosListResponse {
  rows: Vehiculo[];
  total: number;
  page: number;
  limit: number;
}

// Resultado liviano del endpoint by-patente, incluye info del dueño
export interface VehiculoBusqueda {
  id: number;
  cliente_id: number;
  patente: string;
  marca: string;
  modelo: string;
  anio?: number | null;
  cliente_nombre: string;
  cliente_apellido: string;
}

export const vehiculosApi = {
  listar: (params?: Record<string, unknown>) =>
    api.get<{ ok: boolean; data: VehiculosListResponse }>("/vehiculos", { params }),
  obtener: (id: number) => api.get<{ ok: boolean; data: Vehiculo }>(`/vehiculos/${id}`),
  crear: (payload: Record<string, unknown>) =>
    api.post<{ ok: boolean; data: Vehiculo }>("/vehiculos", payload),
  actualizar: (id: number, payload: Record<string, unknown>) =>
    api.put<{ ok: boolean; data: Vehiculo }>(`/vehiculos/${id}`, payload),
  eliminar: (id: number) => api.delete<{ ok: boolean; message: string }>(`/vehiculos/${id}`),
  buscarPorPatente: (patente: string) =>
    api.get<{ ok: boolean; data: VehiculoBusqueda | null }>(`/vehiculos/by-patente/${encodeURIComponent(patente)}`),
};
