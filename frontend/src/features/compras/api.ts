import api from "../../shared/lib/axios";

export interface CompraItem {
  id: number;
  producto_id?: number | null;
  producto_nombre?: string | null;
  descripcion?: string | null;
  codigo?: string | null;
  unidad?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Compra {
  id: number;
  proveedor_id?: number | null;
  proveedor_nombre?: string | null;
  origen_tipo?: "directa" | "proveedor" | "casa_repuestos";
  origen_nombre?: string | null;
  actualiza_stock?: boolean | number;
  fecha: string;
  total: number;
  notas?: string | null;
  empleado_nombre?: string;
  created_at: string;
  items?: CompraItem[];
}

export interface ComprasListResponse {
  rows: Compra[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateCompraPayload {
  proveedor_id?: number | null;
  origen_tipo?: "directa" | "proveedor" | "casa_repuestos";
  origen_nombre?: string | null;
  actualiza_stock?: boolean;
  fecha: string;
  notas?: string | null;
  items: Array<{
    producto_id?: number | null;
    descripcion?: string | null;
    cantidad: number;
    precio_unitario: number;
  }>;
}

export const comprasApi = {
  listar: (params?: Record<string, unknown>) =>
    api.get<{ ok: boolean; data: ComprasListResponse }>("/compras", { params }),

  obtener: (id: number) =>
    api.get<{ ok: boolean; data: Compra }>(`/compras/${id}`),

  crear: (payload: CreateCompraPayload) =>
    api.post<{ ok: boolean; data: Compra }>("/compras", payload),

  eliminar: (id: number) =>
    api.delete<{ ok: boolean; message: string }>(`/compras/${id}`),
};
