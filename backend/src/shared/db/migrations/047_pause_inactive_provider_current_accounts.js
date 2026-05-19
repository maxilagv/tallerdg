exports.up = async (knex) => {
  await knex("cuentas_corrientes_proveedores as cc")
    .leftJoin("proveedores as p", "p.id", "cc.proveedor_id")
    .where("cc.activa", 1)
    .where(function onlyInactiveProviders() {
      this.whereNull("p.id").orWhere("p.activo", 0);
    })
    .update({
      "cc.activa": 0,
      "cc.updated_at": knex.fn.now(),
    });
};

exports.down = async () => {
  // Intentionally irreversible: reactivating old provider accounts would
  // reintroduce hidden debt into Caja without operator review.
};
