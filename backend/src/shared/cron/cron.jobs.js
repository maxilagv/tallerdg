const cron = require("node-cron");
const db = require("../db/knex");
const logger = require("../logger");
const WhatsAppService = require("../../modules/whatsapp/whatsapp.service");

async function getConfig(keys) {
  const rows = await db("configuracion").whereIn("clave", keys);
  return Object.fromEntries(rows.map((row) => [row.clave, row.valor]));
}

async function isWhatsAppEnabled() {
  const config = await getConfig(["wsp_activo"]);
  return config.wsp_activo !== "0";
}

function iniciarCrons() {
  cron.schedule("0 9 * * *", async () => {
    try {
      if (!(await isWhatsAppEnabled())) {
        return;
      }

      const config = await getConfig([
        "recordatorio_deuda_dias",
        "recordatorio_deuda_monto_min",
        "taller_nombre",
      ]);

      const diasIntervalo = Number(config.recordatorio_deuda_dias) || 7;
      const montoMinimo = Number(config.recordatorio_deuda_monto_min) || 1;

      const deudores = await db("ordenes as o")
        .join("clientes as c", "o.cliente_id", "c.id")
        .whereIn("o.estado", ["abierta", "en_proceso", "lista"])
        .whereNotNull("c.telefono")
        .groupBy("c.id", "c.nombre", "c.apellido", "c.telefono")
        .havingRaw("SUM(o.total) >= ?", [montoMinimo])
        .select("c.id", "c.nombre", "c.apellido", "c.telefono", db.raw("SUM(o.total) as deuda_total"));

      for (const deudor of deudores) {
        const ultimoMensaje = await db("wsp_mensajes_log")
          .where({ destinatario: deudor.telefono, tipo: "recordatorio_deuda", estado: "enviado" })
          .orderBy("enviado_at", "desc")
          .first();

        if (ultimoMensaje) {
          const diasDesde = Math.floor(
            (Date.now() - new Date(ultimoMensaje.enviado_at).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diasDesde < diasIntervalo) {
            continue;
          }
        }

        await WhatsAppService.enviarConLog(deudor.telefono, "recordatorio_deuda", {
          nombre: deudor.nombre,
          monto: `$${Number(deudor.deuda_total).toLocaleString("es-AR")}`,
          taller: config.taller_nombre || "el taller",
        });
      }

      logger.info({ total: deudores.length }, "Cron deudores ejecutado");
    } catch (error) {
      logger.error({ error }, "Cron deudores fallo");
    }
  });

  cron.schedule("0 10 * * *", async () => {
    try {
      if (!(await isWhatsAppEnabled())) {
        return;
      }

      const config = await getConfig(["km_proximo_service", "taller_telefono"]);
      const kmUmbral = Number(config.km_proximo_service) || 5000;

      const vehiculos = await db("vehiculos as v")
        .join("clientes as c", "v.cliente_id", "c.id")
        .where("v.activo", 1)
        .whereNotNull("c.telefono")
        .whereRaw("v.km_ultimo_ingreso > 0")
        .select("v.*", "c.nombre", "c.apellido", "c.telefono");

      for (const vehiculo of vehiculos) {
        const ultimaOrden = await db("ordenes")
          .where({ vehiculo_id: vehiculo.id, estado: "cerrada" })
          .orderBy("closed_at", "desc")
          .first();

        if (!ultimaOrden) {
          continue;
        }

        const mesesDesde = Math.floor(
          (Date.now() - new Date(ultimaOrden.closed_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        const kmEstimado = Number(vehiculo.km_ultimo_ingreso) + mesesDesde * 1000;
        const kmProximo = Number(vehiculo.km_ultimo_ingreso) + kmUmbral;

        if (kmEstimado < kmProximo - 500) {
          continue;
        }

        const ultimoMensaje = await db("wsp_mensajes_log")
          .where({ destinatario: vehiculo.telefono, tipo: "proximo_service", estado: "enviado" })
          .where("created_at", ">", db.raw("DATE_SUB(NOW(), INTERVAL 30 DAY)"))
          .first();

        if (ultimoMensaje) {
          continue;
        }

        await WhatsAppService.enviarConLog(vehiculo.telefono, "proximo_service", {
          nombre: vehiculo.nombre,
          marca: vehiculo.marca,
          modelo: vehiculo.modelo,
          patente: vehiculo.patente,
          km_proximo: kmProximo.toLocaleString("es-AR"),
          telefono: config.taller_telefono || "",
        });
      }

      logger.info({ total: vehiculos.length }, "Cron proximos services ejecutado");
    } catch (error) {
      logger.error({ error }, "Cron proximos services fallo");
    }
  });

  cron.schedule("0 11 * * *", async () => {
    try {
      if (!(await isWhatsAppEnabled())) {
        return;
      }

      const config = await getConfig(["taller_telefono"]);
      const hoy = new Date().toISOString().slice(0, 10);

      const recordatorios = await db("ordenes_recordatorios_service as rs")
        .join("ordenes as o", "rs.orden_id", "o.id")
        .join("vehiculos as v", "rs.vehiculo_id", "v.id")
        .join("clientes as c", "v.cliente_id", "c.id")
        .where("rs.activo", 1)
        .whereNull("rs.enviado_at")
        .where("rs.fecha_recordatorio", "<=", hoy)
        .whereNot("o.estado", "cancelada")
        .whereNotNull("c.telefono")
        .select(
          "rs.id",
          "rs.servicio",
          "rs.km_proximo",
          "c.nombre",
          "c.apellido",
          "c.telefono",
          "v.marca",
          "v.modelo",
          "v.patente"
        );

      for (const recordatorio of recordatorios) {
        await WhatsAppService.enviarConLog(recordatorio.telefono, "service_programado", {
          nombre: recordatorio.nombre,
          servicio: recordatorio.servicio,
          marca: recordatorio.marca,
          modelo: recordatorio.modelo,
          patente: recordatorio.patente,
          km_proximo: Number(recordatorio.km_proximo).toLocaleString("es-AR"),
          telefono: config.taller_telefono || "",
        });

        await db("ordenes_recordatorios_service").where({ id: recordatorio.id }).update({
          activo: 0,
          enviado_at: db.fn.now(),
          updated_at: db.fn.now(),
        });
      }

      logger.info({ total: recordatorios.length }, "Cron recordatorios de service programado ejecutado");
    } catch (error) {
      logger.error({ error }, "Cron recordatorios de service programado fallo");
    }
  });

  cron.schedule("0 8 * * *", async () => {
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const vencidos = await db("periodos_sueldo as p")
        .join("empleados as e", "p.empleado_id", "e.id")
        .where("p.estado", "abierto")
        .where("p.fecha_fin", "<", hoy)
        .select("e.nombre", "e.apellido", "p.fecha_fin");

      if (vencidos.length > 0) {
        logger.warn(
          { total: vencidos.length, empleados: vencidos.map((v) => `${v.nombre} ${v.apellido}`) },
          "Hay periodos de sueldo vencidos pendientes de liquidar"
        );
      }
    } catch (error) {
      logger.error({ error }, "Cron periodos sueldo fallo");
    }
  });

  logger.info("Cron jobs de WhatsApp iniciados");
}

module.exports = { iniciarCrons };
