require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";
const frontendUrls = String(process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

module.exports = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: frontendUrls[0] || "http://localhost:5173",
  frontendUrls,
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-prod",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  refreshSecret: process.env.REFRESH_SECRET || "refresh-secret-change-in-prod",
  refreshExpiresIn: process.env.REFRESH_EXPIRES_IN || "7d",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  cookieSameSite: process.env.COOKIE_SAMESITE || (isProduction ? "none" : "lax"),
  cookieSecure:
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === "true"
      : isProduction,
};
