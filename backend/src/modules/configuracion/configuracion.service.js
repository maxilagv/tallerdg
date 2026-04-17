const { z } = require("zod");
const AppError = require("../../shared/errors/AppError");
const { uploadBuffer } = require("../../shared/cloudinary");
const ConfiguracionRepository = require("./configuracion.repository");

const configuracionSchema = z
  .object({
    taller_nombre: z.string().trim().max(150).optional(),
    taller_direccion: z.string().trim().max(255).optional(),
    taller_telefono: z.string().trim().max(50).optional(),
    taller_cuit: z.string().trim().max(30).optional(),
    taller_logo_url: z.string().trim().max(500).optional(),
    moneda_simbolo: z.string().trim().max(10).optional(),
    orden_prefijo: z.string().trim().max(10).optional(),
    remito_prefijo: z.string().trim().max(10).optional(),
    stock_minimo_default: z.string().trim().max(10).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay cambios para guardar.",
  });

function rowsToObject(rows) {
  return Object.fromEntries(rows.map((row) => [row.clave, row.valor || ""]));
}

function serializeEntries(data) {
  return Object.entries(data).map(([clave, valor]) => ({
    clave,
    valor: valor ?? "",
  }));
}

const ConfiguracionService = {
  async obtener() {
    try {
      const rows = await ConfiguracionRepository.findAll();
      return rowsToObject(rows);
    } catch {
      return {};
    }
  },

  async actualizar(data) {
    const parsed = configuracionSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }

    await ConfiguracionRepository.upsertMany(serializeEntries(parsed.data));
    return this.obtener();
  },

  async subirLogo(file) {
    if (!file) {
      throw new AppError("Selecciona una imagen para subir.", 400, "FILE_REQUIRED");
    }

    const uploaded = await uploadBuffer(file.buffer, {
      folder: "tallerpro/configuracion",
      resource_type: "image",
      public_id: `logo-${Date.now()}`,
      overwrite: true,
    });

    await ConfiguracionRepository.upsertMany([
      {
        clave: "taller_logo_url",
        valor: uploaded.secure_url,
      },
    ]);

    return {
      logo_url: uploaded.secure_url,
      configuracion: await this.obtener(),
    };
  },
};

module.exports = ConfiguracionService;
