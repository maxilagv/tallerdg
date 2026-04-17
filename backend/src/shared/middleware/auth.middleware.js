const jwt = require("jsonwebtoken");
const config = require("../../config");
const AppError = require("../errors/AppError");

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(
      new AppError(
        "No autenticado. Inicia sesion para continuar.",
        401,
        "UNAUTHORIZED"
      )
    );
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = payload;
    return next();
  } catch (error) {
    return next(
      new AppError(
        "Tu sesion expiro. Inicia sesion de nuevo.",
        401,
        "TOKEN_EXPIRED"
      )
    );
  }
}

module.exports = authMiddleware;
