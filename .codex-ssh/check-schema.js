require("dotenv").config();
const db = require("./src/shared/db/knex");

Promise.all([
  db.schema.hasColumn("compras", "origen_tipo"),
  db.schema.hasColumn("compras", "origen_nombre"),
  db.schema.hasColumn("compras", "actualiza_stock"),
  db.schema.hasColumn("compra_items", "descripcion"),
])
  .then((result) => {
    console.log(JSON.stringify({
      compras_origen_tipo: result[0],
      compras_origen_nombre: result[1],
      compras_actualiza_stock: result[2],
      compra_items_descripcion: result[3],
    }));
  })
  .finally(() => db.destroy());
