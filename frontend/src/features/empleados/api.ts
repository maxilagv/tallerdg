import api from "../../shared/lib/axios";

export interface Rol {
  id: number;
  nombre: string;
  permisos: Record<string, "r" | "rw">;
}

export interface Empleado {
  id: number;
  rol_id: number;
  rol_nombre: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  email: string;
  activo: number | boolean;
  permisos: Record<string, "r" | "rw">;
  created_at: string;
}

export interface EmpleadosListResponse {
  rows: Empleado[];
  total: number;
  page: number;
  limit: number;
}

export const empleadosApi = {
  listar: (params?: Record<string, unknown>) =>
    api.get<{ ok: boolean; data: EmpleadosListResponse }>("/empleados", { params }),
  obtener: (id: number) => api.get<{ ok: boolean; data: Empleado }>(`/empleados/${id}`),
  crear: (payload: Record<string, unknown>) =>
    api.post<{ ok: boolean; data: Empleado }>("/empleados", payload),
  actualizar: (id: number, payload: Record<string, unknown>) =>
    api.put<{ ok: boolean; data: Empleado }>(`/empleados/${id}`, payload),
  eliminar: (id: number) => api.delete<{ ok: boolean; message: string }>(`/empleados/${id}`),
  cambiarPassword: (id: number, password: string) =>
    api.put<{ ok: boolean; message: string }>(`/empleados/${id}/password`, { password }),
  listarRoles: () => api.get<{ ok: boolean; data: Rol[] }>("/empleados/roles"),
  actualizarRol: (id: number, payload: { nombre?: string; permisos: Record<string, string> }) =>
    api.put<{ ok: boolean; data: Rol }>(`/empleados/roles/${id}`, payload),
};
