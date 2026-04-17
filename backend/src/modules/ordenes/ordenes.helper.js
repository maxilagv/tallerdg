const db = require("../../shared/db/knex");

async function getConfigValue(clave, fallback, trx = db) {
  const row = await trx("configuracion").where({ clave }).first();
  return row?.valor || fallback;
}

async function generarNumeroOrden(id, trx = db) {
  const prefijo = await getConfigValue("orden_prefijo", "ORD", trx);
  return `${prefijo}-${String(id).padStart(4, "0")}`;
}

async function generarNumeroRemito(ordenId, trx = db) {
  const prefijo = await getConfigValue("remito_prefijo", "REM", trx);
  return `${prefijo}-${String(ordenId).padStart(4, "0")}`;
}

module.exports = {
  generarNumeroOrden,
  generarNumeroRemito,
  getConfigValue,
};
