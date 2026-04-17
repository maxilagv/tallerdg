require("dotenv").config({ path: "../../.env" });
const ClientesRepository = require("./src/modules/clientes/clientes.repository");
const db = require("./src/shared/db/knex");

async function run() {
  try {
    const res = await ClientesRepository.findAll({ page: 1, limit: 50, q: "Juan Perez" });
    console.log("Success:", res.rows.length);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    db.destroy();
  }
}

run();
