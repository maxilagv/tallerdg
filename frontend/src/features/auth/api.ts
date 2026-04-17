import { publicApi } from "../../shared/lib/axios";
import type { Empleado } from "../../shared/store/authStore";

interface AuthResponse {
  ok: boolean;
  accessToken: string;
  empleado: Empleado;
}

export const authApi = {
  login: (payload: { email: string; password: string }) =>
    publicApi.post<AuthResponse>("/auth/login", payload),
  refresh: () => publicApi.post<AuthResponse>("/auth/refresh"),
  logout: () => publicApi.post<{ ok: boolean; message: string }>("/auth/logout"),
};
