const db = require("../../shared/db/knex");

// Orden de borrado: primero las tablas con FK hacia otras, luego las referenciadas.
// Con FK_CHECKS desactivado el orden no es crítico, pero se mantiene legible.
const TABLAS_OPERATIVAS = [
  "wsp_mensajes_log",
  "pagos",
  "movimientos_cuenta_proveedor",
  "cuentas_corrientes_proveedores",
  "orden_servicios",
  "orden_productos",
  "movimientos_stock",
  "remitos",
  "ordenes",
  "compra_items",
  "compras",
  "ventas_rapidas",
  "gastos",
  "movimientos_caja",
  "ofertas",
  "vehiculos",
  "clientes",
  "servicios",
  "productos",
  "proveedores",
  "categorias",
  "categorias_gastos",
];

const AdminService = {
  async resetDatabase() {
    // Se usa una transacción para garantizar que todos los DELETEs corran sobre
    // la misma conexión del pool. Así SET FOREIGN_KEY_CHECKS = 0 aplica a todas
    // las queries del loop. Si algún DELETE falla, la transacción hace rollback
    // y la base queda en estado consistente.
    await db.transaction(async (trx) => {
      await trx.raw("SET FOREIGN_KEY_CHECKS = 0");
      try {
        for (const tabla of TABLAS_OPERATIVAS) {
          await trx(tabla).del();
        }
      } finally {
        await trx.raw("SET FOREIGN_KEY_CHECKS = 1");
      }
    });

    return { tablas_vaciadas: TABLAS_OPERATIVAS.length };
  },
};

module.exports = AdminService;
