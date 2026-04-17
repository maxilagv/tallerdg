exports.up = async function up(knex) {
  await knex.raw(
    "ALTER TABLE clientes ADD FULLTEXT idx_ft_cliente (nombre, apellido, telefono)"
  );
};

exports.down = async function down(knex) {
  await knex.raw("ALTER TABLE clientes DROP INDEX idx_ft_cliente");
};
