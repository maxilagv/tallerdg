const { z } = require("zod");
const db = require("../../shared/db/knex");
const ClientesRepository = require("./clientes.repository");
const VehiculosRepository = require("../vehiculos/vehiculos.repository");
const AppError = require("../../shared/errors/AppError");
const PagosRepository = require("../pagos/pagos.repository");
const {
  createClienteSchema,
  updateClienteSchema,
  paginationSchema,
  registroExpressSchema,
} = require("./clientes.validation");

const idSchema = z.coerce.number().int().positive();

function parseId(value) {
  const parsed = idSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError("Identificador invalido.", 400, "VALIDATION_ERROR");
  }

  return parsed.data;
}

const ClientesService = {
  async listar(query) {
    const parsed = paginationSchema.safeParse(query);

    if (!parsed.success) {
      throw new AppError("Parametros invalidos.", 400, "VALIDATION_ERROR");
    }

    return ClientesRepository.findAll(parsed.data);
  },

  async obtener(id) {
    const clienteId = parseId(id);
    const cliente = await ClientesRepository.findByIdConVehiculos(clienteId);

    if (!cliente) {
      throw new AppError("Cliente no encontrado.", 404, "NOT_FOUND");
    }

    return cliente;
  },

  async deuda(id) {
    const clienteId = parseId(id);
    const cliente = await ClientesRepository.findById(clienteId);

    if (!cliente) {
      throw new AppError("Cliente no encontrado.", 404, "NOT_FOUND");
    }

    const deuda = await PagosRepository.getDeudaCliente(clienteId);

    return {
      cliente_id: clienteId,
      cliente: {
        nombre: cliente.nombre,
        apellido: cliente.apellido,
      },
      total_deuda: deuda.total_deuda,
      ordenes: deuda.ordenes,
    };
  },

  async crear(data) {
    const parsed = createClienteSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }

    return ClientesRepository.create(parsed.data);
  },

  async actualizar(id, data) {
    const clienteId = parseId(id);
    const existing = await ClientesRepository.findById(clienteId);

    if (!existing) {
      throw new AppError("Cliente no encontrado.", 404, "NOT_FOUND");
    }

    const parsed = updateClienteSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }

    return ClientesRepository.update(clienteId, parsed.data);
  },

  async eliminar(id) {
    const clienteId = parseId(id);
    const existing = await ClientesRepository.findById(clienteId);

    if (!existing) {
      throw new AppError("Cliente no encontrado.", 404, "NOT_FOUND");
    }

    await ClientesRepository.softDelete(clienteId);
  },

  async registroExpress(data) {
    const parsed = registroExpressSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const {
      nombre, apellido, telefono, email,
      patente, marca, modelo, anio, color, tipo_combustible, km_actual,
    } = parsed.data;

    // Verificar patente duplicada antes de cualquier insert
    const vehiculoExistente = await VehiculosRepository.findByPatente(patente);

    if (vehiculoExistente) {
      const clienteExistente = await ClientesRepository.findById(vehiculoExistente.cliente_id);
      throw new AppError(
        `La patente ${patente} ya esta registrada.`,
        409,
        "PATENTE_DUPLICADA",
        {
          vehiculo_id: vehiculoExistente.id,
          cliente_id: vehiculoExistente.cliente_id,
          cliente_nombre: clienteExistente
            ? `${clienteExistente.apellido}, ${clienteExistente.nombre}`
            : "Desconocido",
          patente,
          marca: vehiculoExistente.marca,
          modelo: vehiculoExistente.modelo,
        }
      );
    }

    // Verificar teléfono duplicado — soft warning, no bloquea
    let warning = null;

    if (telefono) {
      const clienteTelDuplicado = await ClientesRepository.findByTelefono(telefono);

      if (clienteTelDuplicado) {
        warning = {
          tipo: "TELEFONO_DUPLICADO",
          cliente_id: clienteTelDuplicado.id,
          cliente_nombre: `${clienteTelDuplicado.apellido}, ${clienteTelDuplicado.nombre}`,
        };
      }
    }

    // Transacción: cliente + vehículo atómicamente
    const { clienteId, vehiculoId } = await db.transaction(async (trx) => {
      const [newClienteId] = await trx("clientes").insert({
        nombre,
        apellido,
        telefono: telefono || null,
        email: email || null,
      });

      const [newVehiculoId] = await trx("vehiculos").insert({
        cliente_id: newClienteId,
        patente,
        patente_normalizada: patente,
        marca,
        modelo,
        anio: anio || null,
        color: color || null,
        tipo_combustible,
        km_ultimo_service: km_actual,
      });

      return { clienteId: newClienteId, vehiculoId: newVehiculoId };
    });

    // Fetch completo post-commit usando los repositories existentes
    const [cliente, vehiculo] = await Promise.all([
      ClientesRepository.findById(clienteId),
      VehiculosRepository.findById(vehiculoId),
    ]);

    return { cliente, vehiculo, warning };
  },
};

module.exports = ClientesService;
