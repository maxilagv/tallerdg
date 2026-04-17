const bcrypt = require("bcryptjs");
const knexFactory = require("knex");

const required = ["DATABASE_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD"];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const db = knexFactory({
  client: "mysql2",
  connection: process.env.DATABASE_URL,
});

const roles = [
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
];

const configuracion = [
  ["taller_nombre", "Taller DG", "Nombre del taller"],
  ["taller_direccion", "", "Direccion del taller"],
  ["taller_telefono", "", "Telefono de contacto"],
  ["taller_cuit", "", "CUIT del taller"],
  ["taller_logo_url", "", "URL del logo"],
  ["moneda_simbolo", "$", "Simbolo de moneda"],
  ["orden_prefijo", "ORD", "Prefijo numero de orden"],
  ["remito_prefijo", "REM", "Prefijo numero de remito"],
  ["stock_minimo_default", "5", "Stock minimo predeterminado para productos"],
  ["wsp_activo", "1", "WhatsApp activado (1=si, 0=no)"],
  ["wsp_notificar_orden_cerrada", "1", "Notificar al cliente cuando el trabajo esta listo"],
  ["recordatorio_deuda_dias", "7", "Cada cuantos dias recordar a deudores"],
  ["recordatorio_deuda_monto_min", "5000", "Monto minimo de deuda para enviar recordatorio"],
  ["km_proximo_service", "5000", "Km de umbral para avisar proximo service"],
];

const categorias = [
  { nombre: "Mecanica general", tipo: "servicio" },
  { nombre: "Aire acondicionado", tipo: "servicio" },
  { nombre: "GNC", tipo: "servicio" },
  { nombre: "Lubricentro", tipo: "servicio" },
  { nombre: "Inyeccion electronica", tipo: "servicio" },
  { nombre: "Suspension y direccion", tipo: "servicio" },
  { nombre: "Frenos", tipo: "servicio" },
  { nombre: "Lubricantes y aceites", tipo: "producto" },
  { nombre: "Filtros", tipo: "producto" },
  { nombre: "Frenos y pastillas", tipo: "producto" },
  { nombre: "Repuestos GNC", tipo: "producto" },
  { nombre: "Repuestos A/C", tipo: "producto" },
  { nombre: "Electricidad", tipo: "producto" },
  { nombre: "Correas y cadenas", tipo: "producto" },
  { nombre: "Varios", tipo: "producto" },
];

const categoriasGastos = [
  "Sueldo empleado",
  "Alquiler",
  "Servicios (luz, gas, agua)",
  "Insumos taller",
  "Herramientas",
  "Impuestos",
  "Gasto extraordinario",
  "Otros",
  "Sueldos",
];

async function ensureRoles() {
  for (const role of roles) {
    const existing = await db("roles").where({ id: role.id }).first();
    if (existing) {
      await db("roles")
        .where({ id: role.id })
        .update({ nombre: role.nombre, permisos: role.permisos, updated_at: db.fn.now() });
    } else {
      await db("roles").insert(role);
    }
  }
}

async function ensureConfig() {
  for (const [clave, valor, descripcion] of configuracion) {
    const existing = await db("configuracion").where({ clave }).first();
    if (existing) {
      await db("configuracion").where({ clave }).update({ valor, descripcion, updated_at: db.fn.now() });
    } else {
      await db("configuracion").insert({ clave, valor, descripcion });
    }
  }
}

async function ensureCategorias() {
  const [{ total }] = await db("categorias").count("id as total");
  if (Number(total) === 0) {
    await db("categorias").insert(categorias);
  }
}

async function ensureCategoriasGastos() {
  const existentes = await db("categorias_gastos").select("nombre");
  const nombres = new Set(existentes.map((item) => item.nombre));
  const faltantes = categoriasGastos
    .filter((nombre) => !nombres.has(nombre))
    .map((nombre) => ({ nombre }));

  if (faltantes.length) {
    await db("categorias_gastos").insert(faltantes);
  }
}

async function ensureAdmin() {
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
  const email = String(process.env.ADMIN_EMAIL).trim().toLowerCase();
  const existing = await db("empleados").whereRaw("LOWER(email) = ?", [email]).first();

  if (existing) {
    await db("empleados").where({ id: existing.id }).update({
      rol_id: 1,
      nombre: "Dulio",
      apellido: "Admin",
      email,
      telefono: null,
      password_hash: passwordHash,
      activo: 1,
      updated_at: db.fn.now(),
    });
    return existing.id;
  }

  const [id] = await db("empleados").insert({
    rol_id: 1,
    nombre: "Dulio",
    apellido: "Admin",
    email,
    telefono: null,
    password_hash: passwordHash,
    activo: 1,
  });

  return id;
}

async function main() {
  await ensureRoles();
  await ensureConfig();
  await ensureCategorias();
  await ensureCategoriasGastos();
  const adminId = await ensureAdmin();

  console.log(
    JSON.stringify(
      {
        ok: true,
        admin_id: adminId,
        admin_email: process.env.ADMIN_EMAIL,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.destroy();
  });
