const AppError = require("../../shared/errors/AppError");
const AdminService = require("./admin.service");

const FRASE_CONFIRMACION = "VACIAR BASE";

const AdminController = {
  async resetDatabase(req, res) {
    const { confirmacion } = req.body;

    if (confirmacion !== FRASE_CONFIRMACION) {
      throw new AppError(
        `Frase de confirmación incorrecta. Escribí exactamente: "${FRASE_CONFIRMACION}".`,
        400,
        "CONFIRMATION_REQUIRED"
      );
    }

    const result = await AdminService.resetDatabase();

    return res.json({
      ok: true,
      data: result,
      message: "Base de datos vaciada correctamente.",
    });
  },
};

module.exports = AdminController;
