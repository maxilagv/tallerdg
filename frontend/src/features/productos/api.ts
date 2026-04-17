import api from "../../shared/lib/axios";

export interface Producto {
  id: number;
  categoria_id: number;
  categoria_nombre: string;
  proveedor_id?: number | null;
  proveedor_nombre?: string | null;
  nombre: string;
  codigo?: string | null;
  marca?: string | null;
  descripcion?: string | null;
  precio_costo: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  unidad: string;
  created_at?: string;
  movimientos?: Array<{
    id: number;
    tipo: string;
    cantidad: number;
    stock_anterior: number;
    stock_nuevo: number;
    notas?: string | null;
    created_at: string;
  }>;
}

export interface ProductosListResponse {
  rows: Producto[];
  total: number;
  page: number;
  limit: number;
}

export const productosApi = {
  listar: (params?: Record<string, unknown>) =>
    api.get<{ ok: boolean; data: ProductosListResponse }>("/productos", { params }),
  obtener: (id: number) => api.get<{ ok: boolean; data: Producto }>(`/productos/${id}`),
  crear: (payload: Record<string, unknown>) =>
    api.post<{ ok: boolean; data: Producto }>("/productos", payload),
  actualizar: (id: number, payload: Record<string, unknown>) =>
    api.put<{ ok: boolean; data: Producto }>(`/productos/${id}`, payload),
  eliminar: (id: number) => api.delete<{ ok: boolean; message: string }>(`/productos/${id}`),
  stockBajo: () => api.get<{ ok: boolean; data: Producto[] }>("/productos/stock-bajo"),
  ajustarStock: (id: number, payload: { nuevo_stock: number; motivo: string }) =>
    api.post<{ ok: boolean; data: Producto; message: string }>(`/productos/${id}/ajuste-stock`, payload),
  importarExcel: (formData: FormData) =>
    api.post<{ ok: boolean; data: { creados: number; errores: Array<{ fila: string; error: string }> }; message: string }>(
      "/productos/importar-excel",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    ),
};
