import api from "../../shared/lib/axios";

export type MetodoPago =
  | "efectivo"
  | "transferencia"
  | "tarjeta_debito"
  | "tarjeta_credito"
  | "cheque";

export type EstadoPago = "sin_pagar" | "pago_parcial" | "pagado";
export type EstadoCobro = "activo" | "anulado";

export interface Pago {
  id: number;
  orden_id: number;
  orden_numero: string;
  monto: number;
  metodo: MetodoPago;
  fecha?: string;
  referencia?: string | null;
  notas?: string | null;
  created_at: string;
  anulado_at?: string | null;
  motivo_anulacion?: string | null;
  empleado_id: number;
  empleado_nombre?: string | null;
  anulado_por?: number | null;
  anulado_por_nombre?: string | null;
  cliente_id: number;
  cliente_nombre: string;
  cliente_apellido: string;
  patente: string;
  estado: EstadoCobro;
  estado_pago?: EstadoPago;
}

export interface TotalCobroPorMetodo {
  metodo: MetodoPago;
  total: number;
}

export interface CobrosListResponse {
  rows: Pago[];
  total: number;
  page: number;
  limit: number;
  resumen: {
    total_cobrado: number;
    cantidad_cobros: number;
    cantidad_ordenes: number;
    totales_por_metodo: TotalCobroPorMetodo[];
  };
}

export interface CrearPagoPayload {
  orden_id: number;
  monto: number;
  metodo: MetodoPago;
  fecha?: string;
  referencia?: string | null;
  notas?: string | null;
}

export interface ListarPagosParams {
  orden_id?: number;
  desde?: string;
  hasta?: string;
  metodo?: MetodoPago;
  empleado_id?: number;
  include_anulados?: boolean;
  page?: number;
  limit?: number;
}

export const metodoPagoOptions: Array<{ value: MetodoPago; label: string }> = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta_debito", label: "Tarjeta de debito" },
  { value: "tarjeta_credito", label: "Tarjeta de credito" },
  { value: "cheque", label: "Cheque" },
];

export const metodoPagoLabels: Record<MetodoPago, string> = Object.fromEntries(
  metodoPagoOptions.map((option) => [option.value, option.label])
) as Record<MetodoPago, string>;

export const estadoPagoMeta: Record<
  EstadoPago,
  { label: string; variant: "red" | "yellow" | "green" }
> = {
  sin_pagar: { label: "Sin pagar", variant: "red" },
  pago_parcial: { label: "Parcial", variant: "yellow" },
  pagado: { label: "Pagado", variant: "green" },
};

export const estadoCobroMeta: Record<
  EstadoCobro,
  { label: string; variant: "green" | "red" }
> = {
  activo: { label: "Activo", variant: "green" },
  anulado: { label: "Anulado", variant: "red" },
};

export const pagosApi = {
  listar: (params?: ListarPagosParams) =>
    api.get<{ ok: boolean; data: CobrosListResponse }>("/pagos", { params }),
  crear: (payload: CrearPagoPayload) =>
    api.post<{ ok: boolean; data: unknown }>("/pagos", payload),
  anular: (id: number, motivo: string) =>
    api.delete<{ ok: boolean; data: unknown; message: string }>(`/pagos/${id}`, {
      data: { motivo },
    }),
  exportarExcel: (params?: ListarPagosParams) =>
    api.get<Blob>("/pagos/export", {
      params,
      responseType: "blob",
    }),
};
