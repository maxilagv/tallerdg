const { z } = require("zod");
const CategoriasRepository = require("../categorias/categorias.repository");
const AppError = require("../../shared/errors/AppError");
const { parsearServiciosExcel } = require("../../shared/excel/excel.parser");
const ServiciosRepository = require("./servicios.repository");
const {
  createServicioSchema,
  updateServicioSchema,
  listServiciosSchema,
  precioMasivoSchema,
} = require("./servicios.validation");

const idSchema = z.coerce.number().int().positive();

async function ensureCategoriaServicio(categoriaId) {
  const categorias = await CategoriasRepository.findAll("servicio");
  const categoria = categorias.find((item) => item.id === categoriaId);

  if (!categoria) {
    throw new AppError("La categoria seleccionada no existe.", 404, "NOT_FOUND");
  }
}

function parseId(value) {
  const parsed = idSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError("Identificador invalido.", 400, "VALIDATION_ERROR");
  }

  return parsed.data;
}

const ServiciosService = {
  async listar(query) {
    const parsed = listServiciosSchema.safeParse(query);

    if (!parsed.success) {
      throw new AppError("Parametros invalidos.", 400, "VALIDATION_ERROR");
    }

    return ServiciosRepository.findAll(parsed.data);
  },

  async obtener(id) {
    const servicioId = parseId(id);
    const servicio = await ServiciosRepository.findById(servicioId);

    if (!servicio) {
      throw new AppError("Servicio no encontrado.", 404, "NOT_FOUND");
    }

    return servicio;
  },

  async crear(data) {
    const parsed = createServicioSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }

    await ensureCategoriaServicio(parsed.data.categoria_id);
    return ServiciosRepository.create(parsed.data);
  },

  async actualizar(id, data) {
    const servicioId = parseId(id);
    const existing = await ServiciosRepository.findById(servicioId);

    if (!existing) {
      throw new AppError("Servicio no encontrado.", 404, "NOT_FOUND");
    }

    const parsed = updateServicioSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }

    if (parsed.data.categoria_id) {
      await ensureCategoriaServicio(parsed.data.categoria_id);
    }

    return ServiciosRepository.update(servicioId, parsed.data);
  },

  async eliminar(id) {
    const servicioId = parseId(id);
    const existing = await ServiciosRepository.findById(servicioId);

    if (!existing) {
      throw new AppError("Servicio no encontrado.", 404, "NOT_FOUND");
    }

    await ServiciosRepository.softDelete(servicioId);
  },

  async aplicarAumentoMasivo(data) {
    const parsed = precioMasivoSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }

    if (parsed.data.categoria_id) {
      await ensureCategoriaServicio(parsed.data.categoria_id);
    }

    await ServiciosRepository.applyMassiveIncrease(parsed.data);
    return { ok: true };
  },

  async importarExcel(file) {
    if (!file) {
      throw new AppError("No se recibió ningún archivo.", 400, "NO_FILE");
    }

    const filas = parsearServiciosExcel(file.buffer);

    if (!filas.length) {
      throw new AppError("El archivo no tiene datos válidos.", 400, "EMPTY_FILE");
    }

    const categorias = await CategoriasRepository.findAll("servicio");
    const categoriaDefault = categorias.find((categoria) => categoria.nombre.toLowerCase() === "mecánica general") || categorias[0];

    if (!categoriaDefault) {
      throw new AppError("No hay categorías de servicio disponibles para importar.", 500, "CONFIG_ERROR");
    }

    let creados = 0;
    const errores = [];

    for (const fila of filas) {
      try {
        await ServiciosRepository.create({
          categoria_id: categoriaDefault.id,
          nombre: fila.nombre,
          descripcion: fila.descripcion || null,
          precio_base: fila.precio_base,
          tiempo_estimado_min: 0,
        });
        creados += 1;
      } catch (error) {
        errores.push({
          fila: fila.nombre,
          error: error.message,
        });
      }
    }

    return { creados, errores };
  },
};

module.exports = ServiciosService;
