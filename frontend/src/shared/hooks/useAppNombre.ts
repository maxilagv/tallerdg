import { useQuery } from "@tanstack/react-query";
import { publicApi } from "../lib/axios";
import type { ConfiguracionData } from "../../features/configuracion/api";

/**
 * Devuelve el nombre del taller configurado.
 * Usa publicApi (sin token) para que funcione también en Login y pantalla de carga.
 * Cae a "TallerPro" si la config no está disponible.
 */
export function useAppNombre(): string {
  const { data } = useQuery({
    queryKey: ["app-nombre"],
    queryFn: () =>
      publicApi.get<{ ok: boolean; data: ConfiguracionData }>("/configuracion"),
    staleTime: 10 * 60 * 1000, // 10 min
    retry: false,
  });

  return data?.data?.data?.taller_nombre?.trim() || "TallerPro";
}
