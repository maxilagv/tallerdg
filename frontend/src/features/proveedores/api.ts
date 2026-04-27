import api from "../../shared/lib/axios";

// ── Tipos base ───────────────────────────────────────────────────────────────

export interface Proveedor {
  id: number;
  nombre: string;
  cuit?: string | null;
  telefono?: string | null;
  email?: string | null;
  condicion_pago?: string | null;
  notas?: string | null;
  /** Saldo de cuenta corriente (solo presente en listado) */
  saldo_cc?: number | null;
  /** Si tiene CC configurada */
  tiene_cc?: number | null;
}

export interface ProveedoresListResponse {
  rows: Proveedor[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateProveedorPayload extends Partial<Proveedor> {
  activar_cuenta_corriente?: boolean;
  saldo_inicial_cc?: number;
}

// ── Cuenta Corriente ─────────────────────────────────────────────────────────

export interface CuentaCorriente {
  id: number;
  proveedor_id: number;
  activa: boolean;
  saldo: number;
  created_at: string;
  updated_at: string;
}

export type TipoMovimiento = "deuda" | "pago" | "ajuste";

export const tipoMovimientoMeta: Record<
  TipoMovimiento,
  { label: string; variant: "red" | "green" | "blue" }
> = {
  deuda: { label: "Deuda", variant: "red" },
  pago: { label: "Pago", variant: "green" },
  ajuste: { label: "Ajuste", variant: "blue" },
};

export interface MovimientoCuenta {
  id: number;
  tipo: TipoMovimiento;
  monto: number;
  descripcion: string;
  compra_id?: number | null;
  compra_fecha?: string | null;
  compra_total?: number | null;
  empleado_nombre?: string;
  created_at: string;
}

export interface MovimientosListResponse {
  rows: MovimientoCuenta[];
  total: number;
  page: number;
  limit: number;
}

export interface CuentaCorrienteDetail {
  proveedor: Proveedor;
  cuenta_corriente: CuentaCorriente | null;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const proveedoresApi = {
  // CRUD
  listar: (params?: Record<string, unknown>) =>
    api.get<{ ok: boolean; data: ProveedoresListResponse }>("/proveedores", {
      params,
    }),

  obtener: (id: number) =>
    api.get<{ ok: boolean; data: Proveedor }>(`/proveedores/${id}`),

  crear: (payload: CreateProveedorPayload) =>
    api.post<{ ok: boolean; data: Proveedor }>("/proveedores", payload),

  actualizar: (id: number, payload: Partial<Proveedor>) =>
    api.put<{ ok: boolean; data: Proveedor }>(`/proveedores/${id}`, payload),

  eliminar: (id: number) =>
    api.delete<{ ok: boolean; message: string }>(`/proveedores/${id}`),

  // Cuenta Corriente
  getCuentaCorriente: (id: number) =>
    api.get<{ ok: boolean; data: CuentaCorrienteDetail }>(
      `/proveedores/${id}/cuenta-corriente`
    ),

  activarCuentaCorriente: (id: number, payload: { saldo_inicial?: number }) =>
    api.post<{ ok: boolean; data: CuentaCorriente }>(
      `/proveedores/${id}/cuenta-corriente/activar`,
      payload
    ),

  getMovimientos: (id: number, params?: Record<string, unknown>) =>
    api.get<{ ok: boolean; data: MovimientosListResponse }>(
      `/proveedores/${id}/cuenta-corriente/movimientos`,
      { params }
    ),

  registrarPago: (
    id: number,
    payload: { monto: number; descripcion: string; fecha?: string }
  ) =>
    api.post<{ ok: boolean; data: CuentaCorriente }>(
      `/proveedores/${id}/cuenta-corriente/pago`,
      payload
    ),
};
