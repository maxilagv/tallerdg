const { v2: cloudinary } = require("cloudinary");
const config = require("../config");
const AppError = require("./errors/AppError");

const isConfigured =
  Boolean(config.cloudinaryCloudName) &&
  Boolean(config.cloudinaryApiKey) &&
  Boolean(config.cloudinaryApiSecret);

if (isConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
    secure: true,
  });
}

function ensureCloudinaryConfigured() {
  if (!isConfigured) {
    throw new AppError(
      "La subida de imagenes no esta configurada en este entorno.",
      500,
      "CLOUDINARY_NOT_CONFIGURED"
    );
  }
}

function uploadBuffer(buffer, options = {}) {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(
          new AppError(
            "No se pudo subir la imagen. Intenta de nuevo.",
            502,
            "CLOUDINARY_UPLOAD_ERROR"
          )
        );
        return;
      }

      resolve(result);
    });

    stream.end(buffer);
  });
}

function deleteImage(publicId) {
  ensureCloudinaryConfigured();
  return cloudinary.uploader.destroy(publicId);
}

module.exports = {
  uploadBuffer,
  deleteImage,
};
