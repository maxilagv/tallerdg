require("dotenv").config();

const baseConfig = {
  client: "mysql2",
  migrations: { directory: "./src/shared/db/migrations" },
  seeds: { directory: "./src/shared/db/seeds" },
};

function mysqlConnectionFromEnv() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const connection = {
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "tallerpro",
  };

  if (process.env.DB_SOCKET_PATH) {
    connection.socketPath = process.env.DB_SOCKET_PATH;
  } else {
    connection.host = process.env.DB_HOST || "127.0.0.1";
  }

  return connection;
}

module.exports = {
  development: {
    ...baseConfig,
    connection: mysqlConnectionFromEnv(),
  },
  production: {
    ...baseConfig,
    connection: mysqlConnectionFromEnv(),
  },
};
