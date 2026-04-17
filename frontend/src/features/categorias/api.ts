import api from "../../shared/lib/axios";

export interface Categoria {
  id: number;
  nombre: string;
  tipo: "servicio" | "producto";
}

export const categoriasApi = {
  listar: (tipo?: "servicio" | "producto") =>
    api.get<{ ok: boolean; data: Categoria[] }>("/categorias", {
      params: tipo ? { tipo } : undefined,
    }),

  crear: (nombre: string, tipo: "servicio" | "producto") =>
    api.post<{ ok: boolean; data: Categoria }>("/categorias", { nombre, tipo }),

  actualizar: (id: number, nombre: string) =>
    api.put<{ ok: boolean; data: Categoria }>(`/categorias/${id}`, { nombre }),

  eliminar: (id: number) =>
    api.delete<{ ok: boolean; message: string }>(`/categorias/${id}`),
};
