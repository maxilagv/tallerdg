import api from "../../shared/lib/axios";

export const adminApi = {
  resetDatabase: (confirmacion: string) =>
    api.post<{ ok: boolean; data: { tablas_vaciadas: number }; message: string }>(
      "/admin/reset",
      { confirmacion }
    ),
};
