const { z } = require("zod");
const AppError = require("../../shared/errors/AppError");
const EmpleadosRepository = require("../empleados/empleados.repository");
const GastosRepository = require("./gastos.repository");
const { listGastosSchema, createGastoSchema, updateGastoSchema } = require("./gastos.validation");

const idSchema = z.coerce.number().int().positive();

function parseId(value) {
  const parsed = idSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError("Identificador invalido.", 400, "VALIDATION_ERROR");
  }

  return parsed.data;
}

function normalizeFecha(value) {
  if (value === undefined) {
    return undefined;
  }

  const raw = value instanceof Date ? value.toISOString() : String(value || "").trim();
  const directMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);

  if (directMatch) {
    return directMatch[1];
  }

  const parsedDate = new Date(raw);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError("La fecha es invalida.", 400, "VALIDATION_ERROR");
  }

  return parsedDate.toISOString().slice(0, 10);
}

async function ensureCategoria(id) {
  const categoria = await GastosRepository.findCategoriaById(id);
  if (!categoria) {
    throw new AppError("La categoria seleccionada no existe.", 404, "NOT_FOUND");
  }
}

async function ensureEmpleado(id) {
  if (!id) {
    return;
  }

  const empleado = await EmpleadosRepository.findById(id);
  if (!empleado) {
    throw new AppError("El empleado de referencia no existe.", 404, "NOT_FOUND");
  }
}

const GastosService = {
  async listar(query) {
    const parsed = listGastosSchema.safeParse(query);

    if (!parsed.success) {
      throw new AppError("Parametros invalidos.", 400, "VALIDATION_ERROR");
    }

    return GastosRepository.findAll(parsed.data);
  },

  async listarCategorias() {
    return GastosRepository.listCategorias();
  },

  async crearCategoria(data) {
    const nombre = String(data?.nombre || "").trim();
    if (!nombre) throw new AppError("El nombre de la categoría es obligatorio.", 400, "VALIDATION_ERROR");
    if (nombre.length > 80) throw new AppError("El nombre no puede superar los 80 caracteres.", 400, "VALIDATION_ERROR");
    return GastosRepository.createCategoria(nombre);
  },

  async actualizarCategoria(id, data) {
    const categoriaId = parseId(id);
    const existing = await GastosRepository.findCategoriaById(categoriaId);
    if (!existing) throw new AppError("Categoría no encontrada.", 404, "NOT_FOUND");
    const nombre = String(data?.nombre || "").trim();
    if (!nombre) throw new AppError("El nombre de la categoría es obligatorio.", 400, "VALIDATION_ERROR");
    return GastosRepository.updateCategoria(categoriaId, nombre);
  },

  async eliminarCategoria(id) {
    const categoriaId = parseId(id);
    const existing = await GastosRepository.findCategoriaById(categoriaId);
    if (!existing) throw new AppError("Categoría no encontrada.", 404, "NOT_FOUND");
    const deleted = await GastosRepository.deleteCategoria(categoriaId);
    if (!deleted) throw new AppError("No se puede eliminar una categoría que tiene gastos registrados.", 409, "CONFLICT");
  },

  async crear(data, usuarioId) {
    const parsed = createGastoSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }

    await ensureCategoria(parsed.data.categoria_id);
    await ensureEmpleado(parsed.data.referencia_empleado_id);

    return GastosRepository.create({
      categoria_id: parsed.data.categoria_id,
      descripcion: parsed.data.descripcion,
      monto: parsed.data.monto,
      metodo_pago: parsed.data.metodo_pago,
      fecha: normalizeFecha(parsed.data.fecha),
      empleado_id: usuarioId || null,
      referencia_empleado_id: parsed.data.referencia_empleado_id || null,
      adjunto_url: parsed.data.adjunto_url || null,
      notas: parsed.data.notas || null,
      activo: 1,
    });
  },

  async actualizar(id, data) {
    const gastoId = parseId(id);
    const existing = await GastosRepository.findById(gastoId);

    if (!existing) {
      throw new AppError("Gasto no encontrado.", 404, "NOT_FOUND");
    }

    const parsed = updateGastoSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }

    if (parsed.data.categoria_id) {
      await ensureCategoria(parsed.data.categoria_id);
    }

    if (parsed.data.referencia_empleado_id !== undefined) {
      await ensureEmpleado(parsed.data.referencia_empleado_id);
    }

    return GastosRepository.update(gastoId, {
      ...parsed.data,
      ...(parsed.data.fecha !== undefined && { fecha: normalizeFecha(parsed.data.fecha) }),
      ...(parsed.data.adjunto_url !== undefined && { adjunto_url: parsed.data.adjunto_url || null }),
      ...(parsed.data.notas !== undefined && { notas: parsed.data.notas || null }),
      ...(parsed.data.referencia_empleado_id !== undefined && {
        referencia_empleado_id: parsed.data.referencia_empleado_id || null,
      }),
    });
  },

  async eliminar(id) {
    const gastoId = parseId(id);
    const existing = await GastosRepository.findById(gastoId);

    if (!existing) {
      throw new AppError("Gasto no encontrado.", 404, "NOT_FOUND");
    }

    await GastosRepository.softDelete(gastoId);
  },
};

module.exports = GastosService;
