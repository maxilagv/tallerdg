const db = require("./knex");

async function getSchemaStatus() {
  await db.raw("SELECT 1 AS ok");

  const [completed, pending] = await db.migrate.list();

  return {
    database_ok: true,
    completed_count: completed.length,
    pending_count: pending.length,
    pending_migrations: pending.map((migration) => migration.file || migration.name || String(migration)),
  };
}

module.exports = {
  getSchemaStatus,
};
