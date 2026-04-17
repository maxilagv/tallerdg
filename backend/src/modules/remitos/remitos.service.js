const db = require("../../shared/db/knex");
const AppError = require("../../shared/errors/AppError");
const { generarRemitoPDF } = require("../../shared/pdf/remito.template");
const OrdenesRepository = require("../ordenes/ordenes.repository");
const { generarNumeroRemito } = require("../ordenes/ordenes.helper");

async function getConfiguracion() {
  const rows = await db("configuracion").select("clave", "valor");
  return Object.fromEntries(rows.map((row) => [row.clave, row.valor]));
}

const RemitosService = {
  async generarParaOrden(ordenId) {
    const orden = await OrdenesRepository.findByIdCompleta(ordenId);

    if (!orden) {
      throw new AppError("Trabajo no encontrado.", 404, "NOT_FOUND");
    }

    if (orden.estado !== "cerrada") {
      throw new AppError("Solo puedes generar un remito para trabajos cerrados.", 400, "INVALID_STATE");
    }

    let remito = await db("remitos").where({ orden_id: ordenId }).first();

    if (!remito) {
      const numero = await generarNumeroRemito(ordenId);
      const [remitoId] = await db("remitos").insert({
        orden_id: ordenId,
        numero,
        pdf_url: null,
      });

      remito = await db("remitos").where({ id: remitoId }).first();
    }

    const configuracion = await getConfiguracion();
    const pdfBuffer = await generarRemitoPDF({ ...orden, remito_numero: remito.numero }, configuracion);

    return {
      numero: remito.numero,
      pdfBuffer,
    };
  },
};

module.exports = RemitosService;
