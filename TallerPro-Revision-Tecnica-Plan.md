# TallerPro - Revision Tecnica del Plan de Implementacion

## Estado general

El plan esta fuerte en estructura, orden de fases y profundidad operativa.
Ya sirve como base de ejecucion real.

Pero antes de usarlo como contrato tecnico de implementacion conviene corregir algunos puntos que hoy son bloqueantes o inconsistentes.

---

## Bloqueantes tecnicos

### 1. Paths de `config` incorrectos en backend

Hay varios `require()` que no coinciden con la estructura propuesta:

- `backend/src/app.js` usa `require('../config')`
- `backend/src/shared/logger.js` usa `require('../../config')`
- `backend/src/shared/middleware/auth.middleware.js` usa `require('../../../config')`

Con la estructura definida en `backend/src/config/index.js`, los imports correctos deberian apuntar a `src/config`.

Impacto:
el backend no levanta.

---

### 2. Falta `cookie-parser`

`AuthController` lee `req.cookies`, pero en `app.js` no existe `cookie-parser` y tampoco esta instalado.

Impacto:
`/auth/refresh` y `/auth/logout` no funcionan.

Correccion:

- instalar `cookie-parser`
- usar `app.use(cookieParser())`

---

### 3. Dependencias faltantes

El codigo propuesto usa librerias que no aparecen en la instalacion inicial:

- `date-fns`
- `cookie-parser`
- `pdfkit`
- `pino-pretty`
- `cloudinary` si se mantiene upload de logo en fases posteriores

Impacto:
varias partes del backend fallan al ejecutar.

---

### 4. `sameSite: 'strict'` rompe refresh token en produccion separada

El plan propone frontend en Vercel y backend en Railway/Render.
En ese escenario, `sameSite: 'strict'` en la cookie del refresh token no sirve para requests cross-site.

Impacto:
el refresh automatico funciona localmente pero falla en produccion.

Correccion:

- si frontend y backend van en dominios distintos: `sameSite: 'none'` y `secure: true`
- si van en mismo dominio con proxy/rewrite: se puede mantener politica mas estricta

---

### 5. `vite.config.ts` no resuelve produccion

La config de proxy de Vite solo aplica al servidor de desarrollo.
No sirve para produccion.

Impacto:
`axios` con `baseURL: '/api'` apunta al dominio del frontend, no al backend desplegado.

Correccion:

- usar `baseURL: import.meta.env.VITE_API_URL || '/api'`
- dejar proxy solo para desarrollo

---

### 6. Migrations con `t.tinyint`

Knex no expone `t.tinyint()` como API estandar.

Impacto:
las migraciones pueden fallar segun version y dialecto.

Correccion:

- usar `t.boolean('activo').defaultTo(true)` si alcanza
- o `t.specificType('activo', 'tinyint(1)').defaultTo(1)` si queres exactitud MySQL

---

### 7. Semilla inicial con orden de borrado riesgoso

El seed hace:

- borrar `roles`
- borrar `empleados`

Con claves foraneas, el orden correcto deberia ser al reves.
Ademas, si existen `refresh_tokens`, tambien hay que limpiarlos primero.
Y `configuracion` tiene claves unicas, por lo que reinsertar sin limpiar o upsert puede fallar.

Impacto:
el seed puede romper en la segunda corrida.

---

## Inconsistencias funcionales

### 8. La busqueda de ordenes aparece antes de existir `ordenes`

En Fase 2 la busqueda global consulta `ordenes`, pero la tabla y el modulo de ordenes aparecen en Fase 4.

Impacto:
cada busqueda va a disparar errores innecesarios o requerir parches feos.

Correccion:

- en Fase 2 buscar solo `clientes` y `vehiculos`
- agregar `ordenes` a la busqueda cuando la Fase 4 este lista

---

### 9. El plan detallado perdio el modulo de `pagos`

En el documento maestro ya estaba corregido que el MVP necesita cobros basicos para poder hablar de deuda real.
En este plan detallado no aparece:

- tabla `pagos`
- endpoints de registro de cobro
- estado de cobro por orden

Impacto:
`deuda del cliente`, `cobrado`, `pendiente` y finanzas reales quedan mal modeladas.

Correccion:

- agregar `pagos` en el MVP
- separar `facturado` de `cobrado`

---

### 10. Stock fraccional mal resuelto

El plan usa:

- `orden_productos.cantidad` como `DECIMAL`
- `unidad` con valores como `litro`
- pero `productos.stock_actual` y `movimientos_stock.stock_anterior/stock_nuevo` como `INT`

Impacto:
el modelo no soporta fracciones de forma consistente.

Correccion:

- llevar todo el stock a `DECIMAL(10,2)` o
- restringir MVP a unidades enteras y remover fracciones del alcance

---

### 11. Sesiones: el plan dice una cosa y el codigo otra

El documento maestro habia quedado con multiples sesiones permitidas.
Pero `saveRefreshToken()` revoca todos los tokens previos del empleado.

Impacto:
hay contradiccion entre politica funcional y codigo.

Correccion:
definir explicitamente una sola politica:

- sesion unica por usuario
- o multiples dispositivos

---

### 12. Finanzas sigue mezclando `orden cerrada` con `dinero cobrado`

`finanzas.repository.js` suma `ordenes.total` como ingresos.
Eso mide facturacion, no cobro.

Impacto:
el tablero financiero puede mentir.

Correccion:

- `facturado = ordenes cerradas`
- `cobrado = pagos registrados`
- `pendiente = facturado - cobrado`

---

## Riesgos de concurrencia

### 13. Descuento de stock vulnerable a concurrencia

`agregarProducto()` lee stock antes de la transaccion y actualiza con ese valor.
Dos usuarios podrian descontar el mismo producto al mismo tiempo.

Impacto:
stock negativo o inconsistente.

Correccion:

- lock pesimista o `SELECT ... FOR UPDATE`
- o update atomico verificando stock disponible dentro de la transaccion

---

### 14. Generacion de numero de orden no es segura bajo concurrencia

`generarNumeroOrden()` busca la ultima orden y suma 1 fuera de una transaccion serializable.

Impacto:
dos ordenes simultaneas pueden generar el mismo numero.

Correccion:

- tabla de secuencias
- lock de fila/configuracion
- o retry ante unique violation

---

## Bugs de implementacion ya visibles

### 15. `clientesApi` usa un tipo no definido

`Cliente` referencia `Vehiculo[]`, pero ese tipo no esta definido ni importado.

Impacto:
error de compilacion TypeScript.

---

### 16. `ClientesPage` muestra `total_vehiculos`, pero backend no lo devuelve

La tabla usa `(c as any).total_vehiculos ?? 0`, pero `findAll()` no calcula esa columna.

Impacto:
la UI siempre muestra `0 autos`.

---

### 17. Servicio de remitos no devuelve PDF si ya existe remito

`RemitosService.generarParaOrden()` devuelve `numero` y `pdf_url` si ya existe, pero el endpoint espera `pdfBuffer`.

Impacto:
la segunda vez que abras el remito el endpoint puede fallar o responder vacio.

Correccion:

- guardar el PDF real y servirlo
- o regenerarlo siempre si no existe archivo persistido

---

## Recomendacion de cierre

El plan esta bien encaminado y no requiere rehacerlo.
Lo correcto es:

1. mantener su estructura por fases
2. corregir estos puntos antes de convertirlo en implementacion literal
3. congelar especialmente:
   - politica de sesiones
   - modelo de pagos
   - modelo de stock decimal o entero
   - estrategia real de deploy y cookies

Con esas correcciones, el plan queda listo para usarse como base de desarrollo senior sin improvisacion.
