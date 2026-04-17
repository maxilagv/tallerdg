const AppError = require("../errors/AppError");

function requirePermiso(modulo, nivel = "r") {
  return (req, res, next) => {
    const permisos = req.user?.permisos || {};

    if (permisos["*"] === "rw") {
      return next();
    }

    const permisoModulo = permisos[modulo];

    if (!permisoModulo) {
      return next(
        new AppError(
          "No tenes permiso para acceder a esta seccion.",
          403,
          "FORBIDDEN"
        )
      );
    }

    if (nivel === "w" && permisoModulo !== "rw") {
      return next(
        new AppError(
          "Solo podes ver esta seccion, no hacer cambios.",
          403,
          "FORBIDDEN"
        )
      );
    }

    return next();
  };
}

module.exports = { requirePermiso };
