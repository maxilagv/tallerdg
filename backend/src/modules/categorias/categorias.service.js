const { z } = require("zod");
const CategoriasRepository = require("./categorias.repository");
const AppError = require("../../shared/errors/AppError");

const querySchema = z.object({
  tipo: z.enum(["servicio", "producto"]).optional(),
});

const TIPOS_VALIDOS = ["servicio", "producto"];

function parseId(raw) {
  const id = parseInt(raw, 10);
  if (!id || id <= 0) throw new AppError("ID inválido.", 400, "VALIDATION_ERROR");
  return id;
}

function validarNombre(nombre) {
  const n = String(nombre || "").trim();
  if (!n) throw new AppError("El nombre de la categoría es obligatorio.", 400, "VALIDATION_ERROR");
  if (n.length < 2) throw new AppError("El nombre debe tener al menos 2 caracteres.", 400, "VALIDATION_ERROR");
  if (n.length > 80) throw new AppError("El nombre no puede superar los 80 caracteres.", 400, "VALIDATION_ERROR");
  return n;
}

const CategoriasService = {
  async listar(query) {
    const parsed = querySchema.safeParse(query);

    if (!parsed.success) {
      throw new AppError("Tipo de categoria invalido.", 400, "VALIDATION_ERROR");
    }

    return CategoriasRepository.findAll(parsed.data.tipo);
  },

  async crear(body) {
    const nombre = validarNombre(body?.nombre);
    const tipo   = body?.tipo;

    if (!TIPOS_VALIDOS.includes(tipo)) {
      throw new AppError('El tipo debe ser "producto" o "servicio".', 400, "VALIDATION_ERROR");
    }

    return CategoriasRepository.create(nombre, tipo);
  },

  async actualizar(rawId, body) {
    const id     = parseId(rawId);
    const nombre = validarNombre(body?.nombre);

    const existing = await CategoriasRepository.findById(id);
    if (!existing) throw new AppError("Categoría no encontrada.", 404, "NOT_FOUND");

    return CategoriasRepository.update(id, nombre);
  },

  async eliminar(rawId) {
    const id = parseId(rawId);

    const existing = await CategoriasRepository.findById(id);
    if (!existing) throw new AppError("Categoría no encontrada.", 404, "NOT_FOUND");

    // Verificar que no tenga productos o servicios usando esta categoría
    const [productos, servicios] = await Promise.all([
      CategoriasRepository.countProductos(id),
      CategoriasRepository.countServicios(id),
    ]);

    if (productos > 0) {
      throw new AppError(
        `No se puede eliminar: hay ${productos} producto(s) usando esta categoría.`,
        409,
        "CONFLICT"
      );
    }

    if (servicios > 0) {
      throw new AppError(
        `No se puede eliminar: hay ${servicios} servicio(s) usando esta categoría.`,
        409,
        "CONFLICT"
      );
    }

    await CategoriasRepository.delete(id);
  },
};

module.exports = CategoriasService;
