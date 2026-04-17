const AppError = require("../errors/AppError");
const logger = require("../logger");

function errorMiddleware(err, req, res, next) {
  logger.error({ err, requestId: req.id }, "Error capturado");

  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      ok: false,
      code: "FILE_TOO_LARGE",
      message: "La imagen es demasiado pesada. El limite es 5 MB.",
    });
  }

  if (err?.code === "ER_BAD_FIELD_ERROR" || err?.code === "ER_NO_SUCH_TABLE") {
    return res.status(503).json({
      ok: false,
      code: "SCHEMA_OUTDATED",
      message: "La base de datos no coincide con esta version del sistema. Aplica las migraciones pendientes.",
    });
  }

  if (err instanceof AppError && err.isOperational) {
    const body = { ok: false, code: err.code, message: err.message };
    if (err.details !== null) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  return res.status(500).json({
    ok: false,
    code: "INTERNAL_ERROR",
    message: "Ocurrio un error inesperado. Por favor intenta de nuevo.",
  });
}

module.exports = errorMiddleware;
