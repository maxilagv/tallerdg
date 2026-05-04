const db = require("../../shared/db/knex");

function calcFechaFin(fechaInicio, periodo) {
  const d = new Date(`${fechaInicio}T12:00:00`);
  if (periodo === "semana") {
    d.setDate(d.getDate() + 6);
  } else if (periodo === "quincena") {
    d.setDate(d.getDate() + 14);
  } else {
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
  }
  return d.toISOString().slice(0, 10);
}

function calcMontoPeriodo(sueldoBase, periodoPago) {
  const total = Number(sueldoBase) || 0;
  if (periodoPago === "quincena") return Number((total / 2).toFixed(2));
  if (periodoPago === "semana") return Number((total / 4).toFixed(2));
  return total;
}

function formatPeriodoLabel(fechaInicio, fechaFin) {
  const opts = { day: "2-digit", month: "short" };
  const inicio = new Date(`${fechaInicio}T12:00:00`).toLocaleDateString("es-AR", opts);
  const fin = new Date(`${fechaFin}T12:00:00`).toLocaleDateString("es-AR", opts);
  return `${inicio} al ${fin}`;
}

async function getCategoriaSueldos(conn) {
  const knex = conn || db;
  const cat = await knex("categorias_gastos")
    .whereRaw("LOWER(nombre) = ?", ["sueldos"])
    .first();

  if (cat) {
    return cat.id;
  }

  const [categoriaId] = await knex("categorias_gastos").insert({ nombre: "Sueldos" });
  return categoriaId;
}

const SueldosRepository = {
  async getConfig(empleadoId) {
    return db("empleado_salario_config").where({ empleado_id: empleadoId }).first();
  },

  async upsertConfig(empleadoId, { sueldo_base, periodo_pago }) {
    const existing = await db("empleado_salario_config")
      .where({ empleado_id: empleadoId })
      .first();

    if (existing) {
      await db("empleado_salario_config")
        .where({ empleado_id: empleadoId })
        .update({ sueldo_base, periodo_pago, updated_at: db.fn.now() });
    } else {
      await db("empleado_salario_config").insert({
        empleado_id: empleadoId,
        sueldo_base,
        periodo_pago,
      });
    }

    return db("empleado_salario_config").where({ empleado_id: empleadoId }).first();
  },

  async getPeriodoAbierto(empleadoId) {
    return db("periodos_sueldo")
      .where({ empleado_id: empleadoId, estado: "abierto" })
      .first();
  },

  async abrirPeriodo(empleadoId, fechaInicio) {
    const config = await db("empleado_salario_config")
      .where({ empleado_id: empleadoId })
      .first();

    if (!config) throw new Error("El empleado no tiene configuracion de sueldo.");

    const fechaFin = calcFechaFin(fechaInicio, config.periodo_pago);
    const sueldoPeriodo = calcMontoPeriodo(config.sueldo_base, config.periodo_pago);

    const [periodoId] = await db("periodos_sueldo").insert({
      empleado_id: empleadoId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      sueldo_base: sueldoPeriodo,
      estado: "abierto",
    });

    return db("periodos_sueldo").where({ id: periodoId }).first();
  },

  async getPeriodoById(periodoId) {
    return db("periodos_sueldo").where({ id: periodoId }).first();
  },

  async updatePeriodo(periodoId, data) {
    await db("periodos_sueldo")
      .where({ id: periodoId })
      .update({ ...data, updated_at: db.fn.now() });
    return this.getPeriodoById(periodoId);
  },

  async getAdelantosDePeriodo(periodoId) {
    return db("adelantos_sueldo")
      .where({ periodo_id: periodoId })
      .orderBy("fecha", "asc")
      .orderBy("created_at", "asc");
  },

  async liquidarPeriodo(periodoId, pagadoPorEmpleadoId, metodoPago = "efectivo") {
    const periodo = await db("periodos_sueldo").where({ id: periodoId }).first();
    if (!periodo) throw new Error("Periodo no encontrado.");
    if (periodo.estado === "pagado") throw new Error("Este periodo ya fue liquidado.");

    const empleado = await db("empleados").where({ id: periodo.empleado_id }).first();
    const [{ total_adelantos }] = await db("adelantos_sueldo")
      .where({ periodo_id: periodoId })
      .sum("monto as total_adelantos");

    const adelantos = Number(total_adelantos) || 0;
    const saldoRestante = Number(periodo.sueldo_base) - adelantos;

    return db.transaction(async (trx) => {
      let gastoId = null;

      if (saldoRestante > 0) {
        const categoriaId = await getCategoriaSueldos(trx);
        const label = formatPeriodoLabel(periodo.fecha_inicio, periodo.fecha_fin);

        const [gId] = await trx("gastos").insert({
          categoria_id: categoriaId,
          descripcion: `Liquidacion sueldo ${label} - ${empleado.nombre} ${empleado.apellido}`,
          monto: saldoRestante,
          metodo_pago: metodoPago,
          fecha: new Date().toISOString().slice(0, 10),
          empleado_id: pagadoPorEmpleadoId || null,
          referencia_empleado_id: periodo.empleado_id,
          activo: 1,
        });
        gastoId = gId;
      }

      await trx("periodos_sueldo").where({ id: periodoId }).update({
        estado: "pagado",
        pagado_at: trx.fn.now(),
        pagado_por_empleado_id: pagadoPorEmpleadoId || null,
        gasto_liquidacion_id: gastoId,
        updated_at: trx.fn.now(),
      });

      return { saldo_pagado: saldoRestante, gasto_id: gastoId };
    });
  },

  async registrarAdelanto(periodoId, { monto, fecha, descripcion, metodo_pago }, registradoPorId) {
    const periodo = await db("periodos_sueldo").where({ id: periodoId }).first();
    if (!periodo) throw new Error("Periodo no encontrado.");
    if (periodo.estado === "pagado") throw new Error("El periodo ya fue liquidado.");

    const empleado = await db("empleados").where({ id: periodo.empleado_id }).first();
    const fechaAdelanto = fecha || new Date().toISOString().slice(0, 10);

    return db.transaction(async (trx) => {
      const categoriaId = await getCategoriaSueldos(trx);

      const [gastoId] = await trx("gastos").insert({
        categoria_id: categoriaId,
        descripcion:
          descripcion?.trim() ||
          `Adelanto de sueldo - ${empleado.nombre} ${empleado.apellido}`,
        monto,
        metodo_pago,
        fecha: fechaAdelanto,
        empleado_id: registradoPorId || null,
        referencia_empleado_id: periodo.empleado_id,
        activo: 1,
      });

      const [adelantoId] = await trx("adelantos_sueldo").insert({
        periodo_id: periodoId,
        empleado_id: periodo.empleado_id,
        monto,
        fecha: fechaAdelanto,
        descripcion: descripcion?.trim() || null,
        gasto_id: gastoId,
        registrado_por_empleado_id: registradoPorId || null,
      });

      return trx("adelantos_sueldo").where({ id: adelantoId }).first();
    });
  },

  async getResumenEmpleados() {
    const empleados = await db("empleados as e")
      .join("roles as r", "e.rol_id", "r.id")
      .where({ "e.activo": 1 })
      .orderBy("e.apellido", "asc")
      .select("e.id", "e.nombre", "e.apellido", "r.nombre as rol");

    const results = await Promise.all(
      empleados.map(async (emp) => {
        const config = await db("empleado_salario_config")
          .where({ empleado_id: emp.id })
          .first();

        const periodoAbierto = await db("periodos_sueldo")
          .where({ empleado_id: emp.id, estado: "abierto" })
          .first();

        let adelantos = 0;
        let adelantosDetalle = [];
        if (periodoAbierto) {
          const [{ suma }] = await db("adelantos_sueldo")
            .where({ periodo_id: periodoAbierto.id })
            .sum("monto as suma");
          adelantos = Number(suma) || 0;
          adelantosDetalle = await db("adelantos_sueldo")
            .where({ periodo_id: periodoAbierto.id })
            .orderBy("fecha", "desc")
            .orderBy("created_at", "desc");
        }

        return {
          ...emp,
          config: config || null,
          periodo_actual: periodoAbierto
            ? { ...periodoAbierto, total_adelantos: adelantos, adelantos: adelantosDetalle }
            : null,
        };
      })
    );

    return results;
  },

  async getHistorialEmpleado(empleadoId, { page, limit }) {
    const offset = (page - 1) * limit;
    const [rows, [{ total }]] = await Promise.all([
      db("periodos_sueldo")
        .where({ empleado_id: empleadoId })
        .orderBy("fecha_inicio", "desc")
        .limit(limit)
        .offset(offset),
      db("periodos_sueldo")
        .where({ empleado_id: empleadoId })
        .count("id as total"),
    ]);

    const rowsConAdelantos = await Promise.all(
      rows.map(async (periodo) => {
        const [{ suma }] = await db("adelantos_sueldo")
          .where({ periodo_id: periodo.id })
          .sum("monto as suma");
        return { ...periodo, total_adelantos: Number(suma) || 0 };
      })
    );

    return { rows: rowsConAdelantos, total: Number(total), page, limit };
  },

  async getPeriodosVencidos() {
    const hoy = new Date().toISOString().slice(0, 10);
    return db("periodos_sueldo as p")
      .join("empleados as e", "p.empleado_id", "e.id")
      .where("p.estado", "abierto")
      .where("p.fecha_fin", "<", hoy)
      .select(
        "p.id",
        "p.fecha_inicio",
        "p.fecha_fin",
        "p.sueldo_base",
        "e.id as empleado_id",
        "e.nombre",
        "e.apellido"
      );
  },
};

module.exports = SueldosRepository;
