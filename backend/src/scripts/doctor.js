const config = require("../config");
const db = require("../shared/db/knex");
const { getSchemaStatus } = require("../shared/db/schema.guard");

async function main() {
  const status = await getSchemaStatus();

  console.log(JSON.stringify({
    node_env: config.nodeEnv,
    database: status.database_ok ? "ok" : "error",
    completed_migrations: status.completed_count,
    pending_migrations: status.pending_migrations,
  }, null, 2));

  if (status.pending_count > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          database: "error",
          message: error?.message || "No se pudo verificar la base de datos.",
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.destroy();
  });
