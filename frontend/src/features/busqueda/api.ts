import api from "../../shared/lib/axios";

export interface SearchResponse {
  clientes: Array<{
    id: number;
    nombre: string;
    apellido: string;
    telefono?: string | null;
  }>;
  vehiculos: Array<{
    id: number;
    patente: string;
    marca: string;
    modelo: string;
    anio?: number | null;
    cliente_id: number;
    cliente_nombre: string;
  }>;
  ordenes: Array<{
    id: number;
    numero: string;
    estado: string;
    patente: string;
    cliente_nombre: string;
  }>;
  total: number;
}

export const busquedaApi = {
  buscar: (q: string) =>
    api.get<{ ok: boolean; data: SearchResponse }>("/buscar", { params: { q } }),
};
