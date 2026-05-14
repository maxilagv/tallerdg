import api, { publicApi } from "../../shared/lib/axios";
import type { Empleado } from "../../shared/store/authStore";

interface AuthResponse {
  ok: boolean;
  accessToken: string;
  empleado: Empleado;
}

export type OwnerAuthorizationScope = "cash_manual_movements";
export type OwnerAuthorizationRequestStatus = "pending" | "approved" | "used" | "rejected" | "expired";

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

export interface OwnerAuthorizationRequest {
  id: number;
  scope: OwnerAuthorizationScope;
  accion: string;
  estado: OwnerAuthorizationRequestStatus;
  payload: Record<string, unknown>;
  solicitante: {
    id: number;
    nombre: string;
    email: string;
  };
  admin: {
    id: number;
    nombre: string;
  } | null;
  code?: string | null;
  code_expires_at: string | null;
  created_at: string;
  approved_at: string | null;
  used_at: string | null;
  rejected_at: string | null;
  reject_reason: string | null;
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
  createAuthorizationRequest: (payload: {
    scope: OwnerAuthorizationScope;
    accion: string;
    payload: object;
  }) => api.post<{ ok: boolean; data: OwnerAuthorizationRequest }>("/auth/owner-authorization-requests", payload),
  authorizationRequests: (params?: { status?: OwnerAuthorizationRequestStatus; limit?: number }) =>
    api.get<{ ok: boolean; data: OwnerAuthorizationRequest[] }>("/auth/owner-authorization-requests", { params }),
  approveAuthorizationRequest: (id: number) =>
    api.post<{ ok: boolean; data: OwnerAuthorizationRequest }>(`/auth/owner-authorization-requests/${id}/approve`),
  rejectAuthorizationRequest: (id: number, payload?: { reason?: string | null }) =>
    api.post<{ ok: boolean; data: OwnerAuthorizationRequest }>(`/auth/owner-authorization-requests/${id}/reject`, payload || {}),
  redeemAuthorizationRequest: (payload: { requestId: number; code: string }) =>
    api.post<{ ok: boolean; token: string; expiresIn: number; request: OwnerAuthorizationRequest }>(
      "/auth/owner-authorization-requests/redeem",
      payload
    ),
};
