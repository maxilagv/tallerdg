import api, { publicApi } from "../../shared/lib/axios";
import type { Empleado } from "../../shared/store/authStore";

interface AuthResponse {
  ok: boolean;
  accessToken: string;
  empleado: Empleado;
}

export type OwnerAuthorizationScope = "cash_manual_movements";

export interface OwnerAuthorizationResponse {
  ok: boolean;
  token: string;
  expiresIn: number;
  scope: OwnerAuthorizationScope;
  owner: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
  };
}

export const authApi = {
  login: (payload: { email: string; password: string }) =>
    publicApi.post<AuthResponse>("/auth/login", payload),
  refresh: () => publicApi.post<AuthResponse>("/auth/refresh"),
  logout: () => publicApi.post<{ ok: boolean; message: string }>("/auth/logout"),
  ownerAuthorization: (payload: {
    email: string;
    password: string;
    scope?: OwnerAuthorizationScope;
  }) => api.post<OwnerAuthorizationResponse>("/auth/owner-authorization", payload),
};
