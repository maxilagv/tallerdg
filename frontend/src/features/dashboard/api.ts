import api from "../../shared/lib/axios";

export interface DashboardHoy {
  ingresos_hoy: number;
  productos_stock_bajo: number;
  ordenes_creadas_hoy: number;
  sueldos_vencidos: number;
  ordenes_abiertas: Array<{
    id: number;
    numero: string;
    estado: string;
    total: number;
    cliente_nombre: string;
    cliente_apellido: string;
    patente: string;
    marca: string;
    modelo: string;
  }>;
}

export const dashboardApi = {
  hoy: () => api.get<{ ok: boolean; data: DashboardHoy }>("/dashboard/hoy"),
};
