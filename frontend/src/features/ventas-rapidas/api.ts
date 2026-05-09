import api from "../../shared/lib/axios";

export type MedioPago = "efectivo" | "tarjeta" | "transferencia" | "otro";

export const medioPagoMeta: Record<MedioPago, { label: string; color: string }> = {
  efectivo:     { label: "Efectivo",     color: "green" },
  tarjeta:      { label: "Tarjeta",      color: "blue" },
  transferencia:{ label: "Transferencia",color: "purple" },
  otro:         { label: "Otro",         color: "gray" },
};

export interface VentaRapidaItem {
  id: number;
  producto_id: number | null;
  producto_nombre: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface VentaRapida {
  id: number;
  fecha: string;
  total: number;
  medio_pago: MedioPago;
  notas?: string | null;
  empleado_nombre?: string;
  created_at: string;
  items?: VentaRapidaItem[];
}

export interface VentasRapidasListResponse {
  rows: VentaRapida[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateVentaRapidaPayload {
  fecha: string;
  medio_pago: MedioPago;
  notas?: string | null;
  items: Array<{
    producto_id?: number | null;
    producto_nombre: string;
    unidad?: string;
    cantidad: number;
    precio_unitario: number;
  }>;
}

export const ventasRapidasApi = {
  listar: (params?: Record<string, unknown>) =>
    api.get<{ ok: boolean; data: VentasRapidasListResponse }>("/ventas-rapidas", { params }),

  obtener: (id: number) =>
    api.get<{ ok: boolean; data: VentaRapida }>(`/ventas-rapidas/${id}`),

  saldoCajaHoy: () =>
    api.get<{ ok: boolean; data: { total: number } }>("/ventas-rapidas/saldo-caja-hoy"),

  crear: (payload: CreateVentaRapidaPayload) =>
    api.post<{ ok: boolean; data: VentaRapida }>("/ventas-rapidas", payload),

  imprimirComprobante: (id: number) =>
    api.get<Blob>(`/ventas-rapidas/${id}/comprobante/pdf`, { responseType: "blob" }),
};
