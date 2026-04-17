const { z } = require("zod");
const db = require("../../shared/db/knex");
const AppError = require("../../shared/errors/AppError");
const { parsearProductosExcel } = require("../../shared/excel/excel.parser");
const CategoriasRepository = require("../categorias/categorias.repository");
const ProveedoresRepository = require("../proveedores/proveedores.repository");
const ProductosRepository = require("./productos.repository");
const {
  createProductoSchema,
  updateProductoSchema,
  listProductosSchema,
  ajusteStockSchema,
} = require("./productos.validation");

const idSchema = z.coerce.number().int().positive();

function parseId(value) {
  const parsed = idSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError("Identificador invalido.", 400, "VALIDATION_ERROR");
  }

  return parsed.data;
}

async function ensureCategoriaProducto(categoriaId) {
  const categorias = await CategoriasRepository.findAll("producto");
  const categoria = categorias.find((item) => item.id === categoriaId);

  if (!categoria) {
    throw new AppError("La categoria seleccionada no existe.", 404, "NOT_FOUND");
  }
}

async function ensureProveedor(proveedorId) {
  if (!proveedorId) {
    return;
  }

  const proveedor = await ProveedoresRepository.findById(proveedorId);

  if (!proveedor) {
    throw new AppError("El proveedor no existe.", 404, "NOT_FOUND");
  }
}

const ProductosService = {
  async listar(query) {
    const parsed = listProductosSchema.safeParse(query);

    if (!parsed.success) {
      throw new AppError("Parametros invalidos.", 400, "VALIDATION_ERROR");
    }

    return ProductosRepository.findAll(parsed.data);
  },

  async obtener(id) {
    const productoId = parseId(id);
    const producto = await ProductosRepository.findById(productoId);

    if (!producto) {
      throw new AppError("Producto no encontrado.", 404, "NOT_FOUND");
    }

    return producto;
  },

  async crear(data) {
    const parsed = createProductoSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }

    await ensureCategoriaProducto(parsed.data.categoria_id);
    await ensureProveedor(parsed.data.proveedor_id);
    return ProductosRepository.create(parsed.data);
  },

  async actualizar(id, data) {
    const productoId = parseId(id);
    const existing = await ProductosRepository.findById(productoId);

    if (!existing) {
      throw new AppError("Producto no encontrado.", 404, "NOT_FOUND");
    }

    const parsed = updateProductoSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }

    if (parsed.data.categoria_id) {
      await ensureCategoriaProducto(parsed.data.categoria_id);
    }

    if (parsed.data.proveedor_id !== undefined) {
      await ensureProveedor(parsed.data.proveedor_id);
    }

    return ProductosRepository.update(productoId, parsed.data);
  },

  async eliminar(id) {
    const productoId = parseId(id);
    const existing = await ProductosRepository.findById(productoId);

    if (!existing) {
      throw new AppError("Producto no encontrado.", 404, "NOT_FOUND");
    }

    if (Number(existing.stock_actual) > 0) {
      throw new AppError(
        "No puedes eliminar un producto con stock disponible.",
        400,
        "PRODUCT_WITH_STOCK"
      );
    }

    await ProductosRepository.softDelete(productoId);
  },

  async stockBajo() {
    return ProductosRepository.findStockBajo();
  },

  async ajustarStock(id, data, empleadoId) {
    const productoId = parseId(id);
    const parsed = ajusteStockSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }

    const producto = await ProductosRepository.ajustarStock(productoId, parsed.data, empleadoId);

    if (!producto) {
      throw new AppError("Producto no encontrado.", 404, "NOT_FOUND");
    }

    return producto;
  },

  async importarExcel(file) {
    if (!file) {
      throw new AppError("No se recibió ningún archivo.", 400, "NO_FILE");
    }

    const filas = parsearProductosExcel(file.buffer);

    if (!filas.length) {
      throw new AppError("El archivo no tiene datos válidos.", 400, "EMPTY_FILE");
    }

    const categorias = await CategoriasRepository.findAll("producto");
    const categoriaDefault = categorias.find((categoria) => categoria.nombre.toLowerCase() === "varios") || categorias[0];

    if (!categoriaDefault) {
      throw new AppError("No hay categorías de producto disponibles para importar.", 500, "CONFIG_ERROR");
    }

    const stockDefaultRow = await db("configuracion").where({ clave: "stock_minimo_default" }).first();
    const stockMinimoDefault = Number(stockDefaultRow?.valor || 0);

    let creados = 0;
    const errores = [];

    for (const fila of filas) {
      try {
        await ProductosRepository.create({
          categoria_id: categoriaDefault.id,
          proveedor_id: null,
          nombre: fila.nombre,
          codigo: fila.codigo || null,
          marca: fila.marca || null,
          descripcion: null,
          precio_costo: fila.precio_costo,
          precio_venta: fila.precio_venta,
          stock_actual: fila.stock_actual,
          stock_minimo: fila.stock_minimo ?? stockMinimoDefault,
          unidad: fila.unidad || "unidad",
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

module.exports = ProductosService;
