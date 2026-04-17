require("dotenv").config();

const baseConfig = {
  client: "mysql2",
  migrations: { directory: "./src/shared/db/migrations" },
  seeds: { directory: "./src/shared/db/seeds" },
};

module.exports = {
  development: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "tallerpro",
    },
  },
  production: {
    ...baseConfig,
    connection: process.env.DATABASE_URL,
  },
};
