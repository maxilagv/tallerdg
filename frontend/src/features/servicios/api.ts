import api from "../../shared/lib/axios";

export interface Servicio {
  id: number;
  categoria_id: number;
  categoria_nombre: string;
  nombre: string;
  descripcion?: string | null;
  precio_base: number;
  tiempo_estimado_min: number;
  created_at: string;
}

export interface ServiciosListResponse {
  rows: Servicio[];
  total: number;
  page: number;
  limit: number;
}

export const serviciosApi = {
  listar: (params?: Record<string, unknown>) =>
    api.get<{ ok: boolean; data: ServiciosListResponse }>("/servicios", { params }),
  crear: (payload: Record<string, unknown>) =>
    api.post<{ ok: boolean; data: Servicio }>("/servicios", payload),
  actualizar: (id: number, payload: Record<string, unknown>) =>
    api.put<{ ok: boolean; data: Servicio }>(`/servicios/${id}`, payload),
  eliminar: (id: number) => api.delete<{ ok: boolean; message: string }>(`/servicios/${id}`),
  aumentoMasivo: (payload: { porcentaje: number; categoria_id?: number | null }) =>
    api.put<{ ok: boolean; message: string }>("/servicios/precio-masivo/actualizar", payload),
};
