const db = require("../../shared/db/knex");

const DashboardService = {
  async hoy() {
    const hoy = new Date().toISOString().slice(0, 10);

    const [ordenesAbiertas, ingresosHoy, stockBajo, ordenesHoyCount, sueldosVencidos] = await Promise.all([
      db("ordenes as o")
        .join("clientes as c", "o.cliente_id", "c.id")
        .join("vehiculos as v", "o.vehiculo_id", "v.id")
        .whereIn("o.estado", ["abierta", "en_proceso", "lista"])
        .orderBy("o.created_at", "desc")
        .select(
          "o.id",
          "o.numero",
          "o.estado",
          "o.total",
          "c.nombre as cliente_nombre",
          "c.apellido as cliente_apellido",
          "v.patente",
          "v.marca",
          "v.modelo"
        ),
      db("ordenes")
        .where("estado", "cerrada")
        .whereRaw("DATE(closed_at) = ?", [hoy])
        .sum("total as total")
        .first(),
      db("productos")
        .where("activo", 1)
        .whereRaw("stock_actual <= stock_minimo")
        .count("id as total")
        .first(),
      db("ordenes").whereRaw("DATE(created_at) = ?", [hoy]).count("id as total").first(),
      db("periodos_sueldo").where("estado", "abierto").where("fecha_fin", "<", hoy).count("id as total").first(),
    ]);

    return {
      ordenes_abiertas: ordenesAbiertas,
      ingresos_hoy: Number(ingresosHoy?.total) || 0,
      productos_stock_bajo: Number(stockBajo?.total) || 0,
      ordenes_creadas_hoy: Number(ordenesHoyCount?.total) || 0,
      sueldos_vencidos: Number(sueldosVencidos?.total) || 0,
    };
  },
};

module.exports = DashboardService;
