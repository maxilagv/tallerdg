import api from "../../shared/lib/axios";

export interface Oferta {
  id: number;
  titulo: string;
  mensaje: string;
  imagen_url: string | null;
  programada_para: string | null;
  enviada_at: string | null;
  total_enviados: number;
  created_at: string;
  updated_at: string;
}

export interface OfertaListResponse {
  rows: Oferta[];
  total: number;
  page: number;
  limit: number;
}

export const ofertasApi = {
  listar: (params?: { page?: number; limit?: number }) =>
    api.get<{ ok: boolean; data: OfertaListResponse }>("/ofertas", { params }),

  crear: (formData: FormData) =>
    api.post<{ ok: boolean; data: Oferta; message: string }>("/ofertas", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  eliminar: (id: number) =>
    api.delete<{ ok: boolean; message: string }>(`/ofertas/${id}`),

  enviar: (id: number) =>
    api.post<{ ok: boolean; data: { enviados: number; total: number }; message: string }>(`/ofertas/${id}/enviar`),
};
