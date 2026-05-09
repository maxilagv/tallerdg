import api from "../../shared/lib/axios";

export interface ConfiguracionData {
  taller_nombre: string;
  taller_direccion: string;
  taller_telefono: string;
  taller_cuit: string;
  taller_logo_url: string;
  moneda_simbolo: string;
  orden_prefijo: string;
  remito_prefijo: string;
  stock_minimo_default: string;
  iva_porcentaje_default: string;
}

export interface LogoUploadResponse {
  logo_url: string;
  configuracion: ConfiguracionData;
}

export const configuracionApi = {
  obtener: () => api.get<{ ok: boolean; data: ConfiguracionData }>("/configuracion"),
  actualizar: (payload: Partial<ConfiguracionData>) =>
    api.put<{ ok: boolean; data: ConfiguracionData; message: string }>("/configuracion", payload),
  subirLogo: (formData: FormData) =>
    api.post<{ ok: boolean; data: LogoUploadResponse; message: string }>("/configuracion/logo", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
};
