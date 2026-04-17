const multer = require("multer");
const AppError = require("../errors/AppError");

const storage = multer.memoryStorage();

function fileFilter(req, file, callback) {
  if (!file.mimetype.startsWith("image/")) {
    callback(new AppError("Solo puedes subir imagenes.", 400, "INVALID_FILE_TYPE"));
    return;
  }

  callback(null, true);
}

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter,
});

module.exports = upload;
