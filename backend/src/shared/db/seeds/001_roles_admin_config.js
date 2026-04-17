const bcrypt = require("bcryptjs");

exports.seed = async function seed(knex) {
  await knex("refresh_tokens").del();
  await knex("pagos").del();
  await knex("remitos").del();
  await knex("orden_productos").del();
  await knex("orden_servicios").del();
  await knex("ordenes").del();
  await knex("movimientos_stock").del();
  await knex("gastos").del();
  await knex("categorias_gastos").del();
  await knex("vehiculos").del();
  await knex("clientes").del();
  await knex("productos").del();
  await knex("proveedores").del();
  await knex("servicios").del();
  await knex("categorias").del();
  await knex("empleados").del();
  await knex("roles").del();
  await knex("configuracion").del();

  await knex("roles").insert([
    { id: 1, nombre: "admin", permisos: JSON.stringify({ "*": "rw" }) },
    {
      id: 2,
      nombre: "mecanico",
      permisos: JSON.stringify({
        ordenes: "rw",
        vehiculos: "r",
        clientes: "r",
        productos: "r",
        servicios: "r",
      }),
    },
    {
      id: 3,
      nombre: "recepcionista",
      permisos: JSON.stringify({
        clientes: "rw",
        vehiculos: "rw",
        ordenes: "r",
        cobros: "rw",
      }),
    },
  ]);

  const passwordHash = await bcrypt.hash("admin1234", 10);

  await knex("empleados").insert({
    rol_id: 1,
    nombre: "Admin",
    apellido: "TallerPro",
    email: "admin@tallerpro.com",
    password_hash: passwordHash,
    telefono: null,
  });

  await knex("configuracion").insert([
    {
      clave: "taller_nombre",
      valor: "Mi Taller",
      descripcion: "Nombre del taller",
    },
    {
      clave: "taller_direccion",
      valor: "",
      descripcion: "Direccion del taller",
    },
    {
      clave: "taller_telefono",
      valor: "",
      descripcion: "Telefono de contacto",
    },
    {
      clave: "taller_cuit",
      valor: "",
      descripcion: "CUIT del taller",
    },
    {
      clave: "taller_logo_url",
      valor: "",
      descripcion: "URL del logo",
    },
    {
      clave: "moneda_simbolo",
      valor: "$",
      descripcion: "Simbolo de moneda",
    },
    {
      clave: "orden_prefijo",
      valor: "ORD",
      descripcion: "Prefijo numero de orden",
    },
    {
      clave: "remito_prefijo",
      valor: "REM",
      descripcion: "Prefijo numero de remito",
    },
    {
      clave: "stock_minimo_default",
      valor: "5",
      descripcion: "Stock mínimo predeterminado para productos",
    },
    {
      clave: "wsp_activo",
      valor: "1",
      descripcion: "WhatsApp activado (1=si, 0=no)",
    },
    {
      clave: "wsp_notificar_orden_cerrada",
      valor: "1",
      descripcion: "Notificar al cliente cuando el trabajo está listo",
    },
    {
      clave: "recordatorio_deuda_dias",
      valor: "7",
      descripcion: "Cada cuántos días recordar a deudores",
    },
    {
      clave: "recordatorio_deuda_monto_min",
      valor: "5000",
      descripcion: "Monto mínimo de deuda para enviar recordatorio",
    },
    {
      clave: "km_proximo_service",
      valor: "5000",
      descripcion: "Km de umbral para avisar próximo service",
    },
  ]);
};
