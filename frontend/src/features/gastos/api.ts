import api from "../../shared/lib/axios";
import type { MetodoPago } from "../pagos/api";

export interface CategoriaGasto {
  id: number;
  nombre: string;
}

export interface Gasto {
  id: number;
  categoria_id: number;
  categoria_nombre: string;
  descripcion: string;
  monto: number;
  metodo_pago?: MetodoPago | null;
  fecha: string;
  empleado_id?: number | null;
  empleado_nombre?: string | null;
  referencia_empleado_id?: number | null;
  referencia_empleado_nombre?: string | null;
  notas?: string | null;
  adjunto_url?: string | null;
}

export interface GastosListResponse {
  rows: Gasto[];
  total: number;
  page: number;
  limit: number;
}

export const gastosApi = {
  listar: (params?: Record<string, unknown>) =>
    api.get<{ ok: boolean; data: GastosListResponse }>("/gastos", { params }),
  listarCategorias: () =>
    api.get<{ ok: boolean; data: CategoriaGasto[] }>("/gastos/categorias"),
  crearCategoria: (nombre: string) =>
    api.post<{ ok: boolean; data: CategoriaGasto }>("/gastos/categorias", { nombre }),
  actualizarCategoria: (id: number, nombre: string) =>
    api.put<{ ok: boolean; data: CategoriaGasto }>(`/gastos/categorias/${id}`, { nombre }),
  eliminarCategoria: (id: number) =>
    api.delete<{ ok: boolean; message: string }>(`/gastos/categorias/${id}`),
  crear: (payload: Record<string, unknown>) =>
    api.post<{ ok: boolean; data: Gasto }>("/gastos", payload),
  actualizar: (id: number, payload: Record<string, unknown>) =>
    api.put<{ ok: boolean; data: Gasto }>(`/gastos/${id}`, payload),
  eliminar: (id: number) =>
    api.delete<{ ok: boolean; message: string }>(`/gastos/${id}`),
};
