const { z } = require("zod");
const db = require("../../shared/db/knex");
const AppError = require("../../shared/errors/AppError");
const ProveedoresRepository = require("./proveedores.repository");
const {
  createProveedorSchema,
  updateProveedorSchema,
  listProveedoresSchema,
  activarCCSchema,
  pagoProveedorSchema,
  listMovimientosSchema,
} = require("./proveedores.validation");

const idSchema = z.coerce.number().int().positive();

function parseId(value) {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError("Identificador invalido.", 400, "VALIDATION_ERROR");
  }
  return parsed.data;
}

function normalizarFechaMovimiento(fecha) {
  if (!fecha) return null;
  const normalized = String(fecha).slice(0, 10);
  const parsed = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("La fecha del movimiento es invalida.", 400, "VALIDATION_ERROR");
  }
  return `${normalized} 12:00:00`;
}

const ProveedoresService = {
  // ── CRUD ──────────────────────────────────────────────────────────────────

  async listar(query) {
    const parsed = listProveedoresSchema.safeParse(query);
    if (!parsed.success) {
      throw new AppError("Parametros invalidos.", 400, "VALIDATION_ERROR");
    }
    return ProveedoresRepository.findAll(parsed.data);
  },

  async obtener(id) {
    const proveedorId = parseId(id);
    const proveedor = await ProveedoresRepository.findById(proveedorId);
    if (!proveedor) {
      throw new AppError("Proveedor no encontrado.", 404, "NOT_FOUND");
    }
    return proveedor;
  },

  async crear(data, empleadoId) {
    const parsed = createProveedorSchema.safeParse(data);
    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const {
      activar_cuenta_corriente: activarCuentaCorriente = false,
      saldo_inicial_cc: saldoInicialCC = 0,
      ...proveedorData
    } = parsed.data;

    if (!activarCuentaCorriente) {
      return ProveedoresRepository.create(proveedorData);
    }

    return db.transaction(async (trx) => {
      const proveedor = await ProveedoresRepository.create(proveedorData, trx);
      const saldoInicial = Number(saldoInicialCC) || 0;

      await trx("cuentas_corrientes_proveedores").insert({
        proveedor_id: proveedor.id,
        activa: true,
        saldo: saldoInicial,
      });

      if (saldoInicial !== 0) {
        await ProveedoresRepository.insertMovimiento(trx, {
          proveedor_id: proveedor.id,
          tipo: saldoInicial > 0 ? "deuda" : "ajuste",
          monto: Math.abs(saldoInicial),
          descripcion:
            saldoInicial > 0
              ? "Deuda inicial al crear proveedor"
              : "Saldo a favor inicial al crear proveedor",
          compra_id: null,
          empleado_id: empleadoId,
        });
      }

      return proveedor;
    });
  },

  async actualizar(id, data) {
    const proveedorId = parseId(id);
    const existing = await ProveedoresRepository.findById(proveedorId);
    if (!existing) {
      throw new AppError("Proveedor no encontrado.", 404, "NOT_FOUND");
    }
    const parsed = updateProveedorSchema.safeParse(data);
    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }
    return ProveedoresRepository.update(proveedorId, parsed.data);
  },

  async eliminar(id) {
    const proveedorId = parseId(id);
    const existing = await ProveedoresRepository.findById(proveedorId);
    if (!existing) {
      throw new AppError("Proveedor no encontrado.", 404, "NOT_FOUND");
    }
    await ProveedoresRepository.softDelete(proveedorId);
  },

  // ── CUENTA CORRIENTE ──────────────────────────────────────────────────────

  async getCuentaCorriente(id) {
    const proveedorId = parseId(id);
    const proveedor = await ProveedoresRepository.findById(proveedorId);
    if (!proveedor) {
      throw new AppError("Proveedor no encontrado.", 404, "NOT_FOUND");
    }
    const cc = await ProveedoresRepository.findCuentaCorriente(proveedorId);
    return { proveedor, cuenta_corriente: cc || null };
  },

  async activarCuentaCorriente(id, data, empleadoId) {
    const proveedorId = parseId(id);
    const proveedor = await ProveedoresRepository.findById(proveedorId);
    if (!proveedor) {
      throw new AppError("Proveedor no encontrado.", 404, "NOT_FOUND");
    }

    const parsed = activarCCSchema.safeParse(data);
    if (!parsed.success) {
      throw new AppError("Datos invalidos.", 400, "VALIDATION_ERROR");
    }

    const existing = await ProveedoresRepository.findCuentaCorriente(proveedorId);

    if (existing) {
      // Togglear activa/inactiva
      const cc = await ProveedoresRepository.toggleActiva(
        proveedorId,
        !existing.activa
      );
      return cc;
    }

    // Primera vez: crear cuenta corriente
    const saldoInicial = parsed.data.saldo_inicial;

    return db.transaction(async (trx) => {
      const [ccId] = await trx("cuentas_corrientes_proveedores").insert({
        proveedor_id: proveedorId,
        activa: true,
        saldo: saldoInicial,
      });

      // Si hay saldo inicial, registrar movimiento de deuda para tener historial
      if (saldoInicial !== 0) {
        await ProveedoresRepository.insertMovimiento(trx, {
          proveedor_id: proveedorId,
          tipo: saldoInicial > 0 ? "deuda" : "ajuste",
          monto: Math.abs(saldoInicial),
          descripcion: "Saldo inicial al activar cuenta corriente",
          compra_id: null,
          empleado_id: empleadoId,
        });
      }

      return trx("cuentas_corrientes_proveedores").where({ id: ccId }).first();
    });
  },

  async registrarPago(id, data, empleadoId) {
    const proveedorId = parseId(id);
    const proveedor = await ProveedoresRepository.findById(proveedorId);
    if (!proveedor) {
      throw new AppError("Proveedor no encontrado.", 404, "NOT_FOUND");
    }

    const cc = await ProveedoresRepository.findCuentaCorriente(proveedorId);
    if (!cc || !cc.activa) {
      throw new AppError(
        "Este proveedor no tiene cuenta corriente activa.",
        400,
        "NO_CUENTA_CORRIENTE"
      );
    }

    const parsed = pagoProveedorSchema.safeParse(data);
    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Datos invalidos.",
        400,
        "VALIDATION_ERROR"
      );
    }

    return db.transaction(async (trx) => {
      await ProveedoresRepository.insertMovimiento(trx, {
        proveedor_id: proveedorId,
        tipo: "pago",
        monto: parsed.data.monto,
        descripcion: parsed.data.descripcion,
        compra_id: null,
        empleado_id: empleadoId,
        metodo_pago: parsed.data.metodo_pago,
        created_at: normalizarFechaMovimiento(parsed.data.fecha),
      });

      // Reducimos la deuda
      await ProveedoresRepository.incrementSaldo(
        trx,
        proveedorId,
        -parsed.data.monto
      );

      return trx("cuentas_corrientes_proveedores")
        .where({ proveedor_id: proveedorId })
        .first();
    });
  },

  async getMovimientos(id, query) {
    const proveedorId = parseId(id);
    const proveedor = await ProveedoresRepository.findById(proveedorId);
    if (!proveedor) {
      throw new AppError("Proveedor no encontrado.", 404, "NOT_FOUND");
    }
    const parsed = listMovimientosSchema.safeParse(query);
    if (!parsed.success) {
      throw new AppError("Parametros invalidos.", 400, "VALIDATION_ERROR");
    }
    return ProveedoresRepository.findMovimientos(proveedorId, parsed.data);
  },
};

module.exports = ProveedoresService;
