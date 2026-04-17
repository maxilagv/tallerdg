import { AxiosError } from "axios";

export function getErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    return (
      (error.response?.data as { message?: string } | undefined)?.message ||
      "Ocurrio un error de conexion. Verifica tu internet e intenta de nuevo."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrio un error inesperado. Intenta de nuevo.";
}
