import api from "../../shared/lib/axios";

export interface WhatsAppEstado {
  estado: string;
  qrCode?: string | null;
  qrUpdatedAt?: string | null;
  qrVersion?: number;
  lastError?: string | null;
  browserPath?: string | null;
}

export interface WhatsAppTemplate {
  id: number;
  tipo: string;
  texto: string;
  activo: number;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppLogItem {
  id: number;
  destinatario: string;
  tipo: string;
  contenido: string;
  estado: "pendiente" | "enviado" | "fallido";
  error_detalle?: string | null;
  created_at: string;
  enviado_at?: string | null;
}

export interface WhatsAppLogResponse {
  rows: WhatsAppLogItem[];
  total: number;
  page: number;
  limit: number;
}

export const whatsappApi = {
  getEstado: () =>
    api.get<{ ok: boolean; data: WhatsAppEstado }>("/whatsapp/estado", {
      params: { t: Date.now() },
      headers: { "Cache-Control": "no-store" },
    }),
  conectar: () =>
    api.post<{ ok: boolean; data: WhatsAppEstado; message: string }>("/whatsapp/conectar"),
  desconectar: () =>
    api.post<{ ok: boolean; data: WhatsAppEstado; message: string }>("/whatsapp/desconectar"),
  reiniciar: () =>
    api.post<{ ok: boolean; data: WhatsAppEstado; message: string }>("/whatsapp/reiniciar"),
  getTemplates: () => api.get<{ ok: boolean; data: WhatsAppTemplate[] }>("/whatsapp/templates"),
  updateTemplate: (id: number, payload: { texto: string; activo?: boolean }) =>
    api.put<{ ok: boolean; data: WhatsAppTemplate; message: string }>(
      `/whatsapp/templates/${id}`,
      payload
    ),
  getLog: (params: { page?: number; limit?: number; tipo?: string; estado?: string }) =>
    api.get<{ ok: boolean; data: WhatsAppLogResponse }>("/whatsapp/log", { params }),
};
