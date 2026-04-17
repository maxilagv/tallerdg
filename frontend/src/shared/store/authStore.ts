import { create } from "zustand";

export interface Empleado {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  rol_id: number;
  permisos: Record<string, string>;
}

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

interface AuthState {
  accessToken: string | null;
  empleado: Empleado | null;
  status: AuthStatus;
  setSession: (token: string, empleado: Empleado) => void;
  setAccessToken: (token: string) => void;
  markUnauthenticated: () => void;
  startChecking: () => void;
  hasPermiso: (modulo: string, nivel?: "r" | "w") => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  empleado: null,
  status: "checking",

  setSession: (token, empleado) =>
    set({
      accessToken: token,
      empleado,
      status: "authenticated",
    }),

  setAccessToken: (token) =>
    set((state) => ({
      accessToken: token,
      status: state.empleado ? "authenticated" : state.status,
    })),

  markUnauthenticated: () =>
    set({
      accessToken: null,
      empleado: null,
      status: "unauthenticated",
    }),

  startChecking: () => set({ status: "checking" }),

  hasPermiso: (modulo, nivel = "r") => {
    const empleado = get().empleado;

    if (!empleado) {
      return false;
    }

    const permisos = empleado.permisos;

    if (permisos["*"] === "rw") {
      return true;
    }

    const permisoModulo = permisos[modulo];

    if (!permisoModulo) {
      return false;
    }

    if (nivel === "w") {
      return permisoModulo === "rw";
    }

    return true;
  },
}));
