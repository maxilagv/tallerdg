// Verificacion rapida (sin servidor ni DB) de la matriz de permisos para
// el rol recepcionista en las rutas sensibles de caja.
//
// Uso: node src/scripts/check-permisos-recepcionista.js
//
// Cubre:
//   1. recepcionista puede leer /finanzas/* (resumen, movimientos, etc.).
//   2. recepcionista NO puede POST /finanzas/reset-caja.
//   3. recepcionista NO puede POST/PUT/DELETE /finanzas/movimientos-titular
//      sin X-Owner-Authorization.
//   4. recepcionista SI puede operar movimientos-titular con override valido.
//   5. admin (permisos {"*":"rw"}) puede operar todo sin override.

const jwt = require("jsonwebtoken");
const config = require("../config");
const {
  requirePermiso,
  requireAdmin,
  requireOwnerAuthorization,
} = require("../shared/middleware/roles.middleware");

const RECEP_PERMISOS = {
  clientes: "rw",
  vehiculos: "rw",
  ordenes: "rw",
  cobros: "rw",
  productos: "rw",
  servicios: "rw",
  gastos: "rw",
  finanzas: "rw",
  empleados: "rw",
  configuracion: "rw",
  whatsapp: "rw",
};

const ADMIN_PERMISOS = { "*": "rw" };

function runMiddleware(mw, req) {
  return new Promise((resolve) => {
    mw(req, {}, (err) => resolve(err || null));
  });
}

function makeReq(permisos, headers = {}) {
  return {
    user: { id: 1, permisos },
    headers,
  };
}

let failed = 0;
function assert(name, condition) {
  const ok = !!condition;
  console.log(`${ok ? "OK  " : "FAIL"}  ${name}`);
  if (!ok) failed += 1;
}

async function main() {
  // 1. recepcionista puede leer /finanzas/resumen
  const errRecepRead = await runMiddleware(
    requirePermiso("finanzas", "r"),
    makeReq(RECEP_PERMISOS)
  );
  assert(
    "recepcionista puede leer /finanzas/resumen",
    errRecepRead === null
  );

  // 2. recepcionista NO puede POST /finanzas/reset-caja
  const errRecepReset = await runMiddleware(
    requireAdmin,
    makeReq(RECEP_PERMISOS)
  );
  assert(
    "recepcionista NO puede POST /finanzas/reset-caja",
    errRecepReset && errRecepReset.statusCode === 403
  );

  // 3. recepcionista NO puede crear movimiento titular sin override
  const errRecepMovSinOverride = await runMiddleware(
    requireOwnerAuthorization("cash_manual_movements"),
    makeReq(RECEP_PERMISOS)
  );
  assert(
    "recepcionista NO puede crear movimiento titular sin autorizacion",
    errRecepMovSinOverride && errRecepMovSinOverride.statusCode === 403
  );

  // 4. recepcionista SI puede crear movimiento titular con override valido
  const overrideToken = jwt.sign(
    {
      kind: "owner_authorization",
      ownerEmpleadoId: 99,
      scopes: ["cash_manual_movements"],
    },
    config.jwtSecret,
    { expiresIn: 60 }
  );
  const errRecepMovOverride = await runMiddleware(
    requireOwnerAuthorization("cash_manual_movements"),
    makeReq(RECEP_PERMISOS, { "x-owner-authorization": overrideToken })
  );
  assert(
    "recepcionista SI puede crear movimiento titular con autorizacion valida",
    errRecepMovOverride === null
  );

  // 4.b override con scope incorrecto debe fallar
  const overrideOtroScope = jwt.sign(
    {
      kind: "owner_authorization",
      ownerEmpleadoId: 99,
      scopes: ["otro_scope"],
    },
    config.jwtSecret,
    { expiresIn: 60 }
  );
  const errScopeMal = await runMiddleware(
    requireOwnerAuthorization("cash_manual_movements"),
    makeReq(RECEP_PERMISOS, { "x-owner-authorization": overrideOtroScope })
  );
  assert(
    "override con scope incorrecto es rechazado",
    errScopeMal && errScopeMal.statusCode === 403
  );

  // 4.c override que no es de tipo owner_authorization debe fallar
  const tokenComun = jwt.sign(
    { id: 1, kind: "access" },
    config.jwtSecret,
    { expiresIn: 60 }
  );
  const errKindMal = await runMiddleware(
    requireOwnerAuthorization("cash_manual_movements"),
    makeReq(RECEP_PERMISOS, { "x-owner-authorization": tokenComun })
  );
  assert(
    "un access token comun no sirve como override",
    errKindMal && errKindMal.statusCode === 403
  );

  // 5. admin puede operar sin override
  const errAdminMov = await runMiddleware(
    requireOwnerAuthorization("cash_manual_movements"),
    makeReq(ADMIN_PERMISOS)
  );
  assert(
    "admin puede crear movimiento titular sin override",
    errAdminMov === null
  );

  const errAdminReset = await runMiddleware(
    requireAdmin,
    makeReq(ADMIN_PERMISOS)
  );
  assert("admin puede POST /finanzas/reset-caja", errAdminReset === null);

  if (failed > 0) {
    console.error(`\n${failed} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log("\nTodas las verificaciones pasaron.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
