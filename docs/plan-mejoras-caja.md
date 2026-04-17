# Plan de Mejoras — Módulo Caja

> Estado: **PLAN — sin cambios implementados aún**
> Fecha: 2026-03-31

---

## Contexto actual

La "caja" es la página `/caja` (`FinanzasPage.tsx`). Agrega 5 fuentes de datos:

| Fuente | Tabla | Tipo |
|---|---|---|
| Cobros de órdenes | `pagos` | Ingreso |
| Ventas rápidas | `ventas_rapidas` | Ingreso |
| Gastos | `gastos` | Egreso |
| Compras | `compras` | Egreso |
| Movimientos del titular | `movimientos_caja` | Ambos |

El reset ("vaciar base") vive en `POST /api/admin/reset` → `admin.service.js`.

---

## Problema 1 — Vaciar base no limpia los datos de caja

### Diagnóstico

Hay **dos bugs independientes** que combinados hacen que los datos parezcan persistir:

#### Bug A — `SET FOREIGN_KEY_CHECKS` no aplica a todo el pool de conexiones

En `admin.service.js`:

```js
await db.raw("SET FOREIGN_KEY_CHECKS = 0");  // ← se ejecuta en conexión X del pool
for (const tabla of TABLAS_OPERATIVAS) {
  await db(tabla).del();  // ← cada .del() puede usar una conexión DISTINTA del pool
}
await db.raw("SET FOREIGN_KEY_CHECKS = 1");
```

`SET FOREIGN_KEY_CHECKS` es **de sesión** en MySQL/MariaDB. Knex usa un pool de conexiones. Si el `.raw()` se ejecuta en la conexión #1 del pool, pero algún `.del()` se ejecuta en la conexión #2, ese DELETE tiene FK checks activos. Si alguna tabla tiene FK dependientes que no están en el orden correcto, puede fallar **silenciosamente** (o con error que se traga el finally).

El bug más grave: **el reset no está envuelto en una transacción**. Si falla en la tabla #7, las tablas 1-6 ya fueron vaciadas pero las 7+ siguen con datos. Queda la base en estado inconsistente.

#### Bug B — React Query cache no se invalida correctamente después del reset

En `ConfiguracionPage.tsx`:
```tsx
onSuccess={() => queryClient.clear()
```

`queryClient.clear()` limpia el cache en memoria. Pero si el usuario **ya está en la página `/caja` en ese momento**, o navega a ella inmediatamente, las queries con `staleTime: 30_000` del `MovimientosTitularPanel` pueden mostrar datos del cache por hasta 30 segundos antes de refetchear.

Además: `queryClient.clear()` no fuerza un refetch inmediato — solo marca el cache como vacío. Las queries subscribidas se re-ejecutan recién en el próximo ciclo de render.

#### Bug C — El panel de movimientos del titular no filtra por fecha

`MovimientosTitularPanel` consulta `finanzasApi.movimientosTitular({ limit: 50 })` sin parámetros `desde`/`hasta`. Esto significa que siempre muestra los **últimos 50 movimientos de todos los tiempos**, ignorando el filtro de período que el usuario configuró en la página. Si el usuario tiene movimientos de meses anteriores que no borró, siguen apareciendo aunque el período seleccionado sea solo el mes actual.

### Fix propuesto

1. **Fix A (backend)**: Envolver el reset en una transacción real usando `db.transaction()` y ejecutar todo dentro de ella con la misma conexión. Alternativamente: hacer todo el reset dentro de un único `db.raw()` con múltiples statements.

2. **Fix B (frontend)**: Después del reset exitoso, hacer `window.location.reload()` en lugar de (o además de) `queryClient.clear()`. Eso garantiza estado limpio total.

3. **Fix C (frontend)**: Pasar `desde`/`hasta` al `MovimientosTitularPanel` como props y usarlos en la query, igual que lo hacen los demás componentes de la página.

---

## Problema 2 — Simplicidad para la carga

### Estado actual

Para registrar un movimiento del titular:
1. Ir a `/caja`
2. Scroll hasta "Tus movimientos de caja"
3. Click "Registrar"
4. Modal: elegir tipo (aporte/retiro)
5. Llenar monto, concepto, fecha, referencia opcional, notas opcionales
6. Guardar

La carga de gastos sigue un flujo similar pero desde otro módulo.

### Problemas detectados

- **Fecha predeterminada no está siendo hoy**: en el modal de registro hay que verificar si `fecha` defaultea a hoy. Si no, el usuario tiene que elegirla cada vez.
- **No hay atajos de concepto frecuentes**: el campo `concepto` es texto libre. Para un mecánico que saca $5.000 "para el almuerzo" todos los días, tener que tipear eso repetidamente es friccción innecesaria.
- **El modal pide datos opcionales visibles siempre**: los campos `referencia` y `notas` están visibles aunque rara vez se usan, ocupando espacio visual y generando dudas ("¿qué pongo acá?").
- **No existe acceso rápido desde el sidebar**: para cargar un movimiento hay que entrar a Caja → scrollear → click. No hay acceso tipo "acción rápida".

### Mejoras propuestas

1. **Fecha defaultea siempre a hoy** (verificar y corregir si no es así ya).
2. **Colapsar campos opcionales** (`referencia`, `notas`) bajo un link "Agregar detalles ▾" visible solo al hacer click.
3. **Sugerencias de concepto**: guardar en `localStorage` los últimos 5 conceptos usados y ofrecerlos como chips clicables arriba del input.
4. **Acceso rápido**: evaluar agregar en la sidebar un botón "+" que abra directamente el modal de movimiento (o llevarlo a caja-rapida). Scope: discutir con el usuario si tiene sentido dado el layout actual.

---

## Problema 3 — Caja desordenada / no intuitiva

### Estado actual

La página tiene esta estructura:
1. Encabezado + botón exportar
2. Filtro de período
3. Cards "Lo que hizo el taller" (Cobrado, Gastado, Resultado)
4. Card grande "Saldo en caja"
5. Panel "Tus movimientos de caja" (CRUD completo)
6. Card "¿Cómo cobró el taller?"
7. Gráficos (por día, por categoría)

### Problemas detectados

- **El saldo real queda enterrado**: el número más importante (saldo en caja) es la card #4 pero visualmente compite con mucho contenido arriba.
- **El CRUD de movimientos interrumpe el flujo de lectura**: el panel editable está en medio de la página de lectura/análisis. Un usuario que solo quiere ver cuánto hay en caja tiene que scrollear el panel de gestión.
- **"¿Cómo cobró el taller?" aparece solo si hay datos**: si no hubo ventas, el bloque desaparece, generando saltos en el layout que confunden.
- **Los gráficos no tienen contexto visible**: cuando la pantalla es angosta, los gráficos se ven pequeños sin título claro.
- **Término "aporte_titular" / "retiro_titular"**: el código interno se filtra bien, pero en el UI a veces se cuela lenguaje técnico que confunde al dueño del taller.

### Reorganización propuesta

```
[SALDO EN CAJA — número grande, arriba de todo]
  → Con el desglose pequeño debajo (resultado + aportes - retiros)

[LO QUE HIZO EL TALLER — 3 cards horizontales]
  Cobrado | Gastado | Resultado

[¿CÓMO COBRÓ? — métodos de pago]
  (siempre visible, aunque diga "Sin datos")

[TUS MOVIMIENTOS — acordeón cerrado por defecto]
  → Se expande con click. Arriba muestra el neto resumido.
  → Al expandir, aparece el CRUD completo.

[GRÁFICOS — al final, con título siempre visible]
```

Esta reorganización pone **el saldo primero** (lo que más interesa), mantiene el análisis en el medio, y empuja la edición de movimientos a un acordeón que no interrumpe la lectura.

---

## Problema 4 — Prevención de errores en producción

### Diagnóstico de riesgos

#### Riesgo crítico: Reset sin transacción (ya mencionado en P1)
- **Escenario**: el reset falla en la tabla #10. Tablas 1-9 borradas, 10-22 intactas. La base queda inconsistente: hay órdenes sin clientes, pagos sin órdenes, etc.
- **Impacto**: la app puede crashear o mostrar datos corruptos.
- **Fix**: usar `db.transaction()` + tratar el FK_CHECKS dentro de la misma transacción.

#### Riesgo alto: Monto $0 en movimientos
- **Escenario**: el usuario hace click en "Guardar" sin escribir monto (queda en 0).
- **Estado actual**: la validación Zod en backend pide `monto: z.number().positive()`. Pero si el frontend envía `0`, Zod lo rechaza con 422.
- **Problema**: el mensaje de error del 422 puede no ser claro en el frontend.
- **Fix**: validación en el formulario que bloquee el submit si monto <= 0 con mensaje inline claro.

#### Riesgo alto: Período mal configurado borra el contexto visual
- **Escenario**: el usuario pone `hasta` antes que `desde` (ej: desde 2026-03-31, hasta 2026-03-01).
- **Estado actual**: el backend no valida que `desde <= hasta`.
- **Resultado**: todas las queries devuelven 0 resultados, la caja aparece vacía. El usuario cree que perdió datos.
- **Fix**: validar en frontend que `desde <= hasta` y mostrar advertencia. Validar también en backend con Zod (`rangoSchema`).

#### Riesgo medio: Export Excel con rango enorme
- **Escenario**: usuario exporta "todo el año" con miles de movimientos.
- **Estado actual**: no hay límite de filas en `exportarExcel()`.
- **Resultado potencial**: timeout en el servidor o archivo Excel de cientos de MB.
- **Fix**: límite de 6 meses máximo en el rango de exportación (con mensaje claro si supera).

#### Riesgo medio: Doble submit en formulario de movimiento
- **Escenario**: conexión lenta. El usuario hace click en "Guardar", no pasa nada visible, vuelve a hacer click.
- **Estado actual**: el botón tiene `loading={mutation.isPending}` que debería deshabilitar el botón. Verificar que efectivamente se deshabilita y no solo muestra spinner.
- **Fix**: confirmar en código que `disabled={mutation.isPending}` está en el botón submit del modal.

#### Riesgo medio: Timezone en fechas
- **Escenario**: el servidor corre en UTC (ej: hosting Linux). El usuario del taller está en Argentina (UTC-3). A las 21hs del 31 de marzo, si registra un movimiento, en el servidor son las 00hs del 1 de abril. El movimiento queda guardado en abril aunque el usuario pensó que era marzo.
- **Estado actual**: `finanzas.service.js` usa `formatLocalDate()` en frontend para construir el string `YYYY-MM-DD`. El backend recibe ese string directamente.
- **Evaluación**: si el frontend siempre envía `YYYY-MM-DD` como string (sin conversión a UTC), el problema no existe porque nunca pasa por un objeto `Date` en el servidor. Confirmar que todos los campos de fecha se manejan como strings ISO en todo el pipeline.

#### Riesgo bajo: Paginación del panel de movimientos
- **Estado actual**: `MovimientosTitularPanel` pide `limit: 50` sin paginación UI.
- **Escenario**: taller con mucho tiempo de uso acumula 50+ movimientos. Los más antiguos no se ven y no hay manera de acceder a ellos desde la UI.
- **Fix**: agregar paginación básica (botón "Ver más" o paginador).

#### Riesgo bajo: Eliminación sin soft-delete recovery
- **Estado actual**: eliminar un movimiento hace soft delete (`activo = 0`). El dato queda en la DB pero nunca se puede recuperar desde la UI.
- **Impacto**: si se borra por error, se pierde para siempre desde la perspectiva del usuario.
- **Fix** (opcional): podría ser suficiente con el confirm actual. No prioritario.

---

## Resumen de prioridades

| # | Problema | Impacto | Esfuerzo |
|---|---|---|---|
| P1-A | Reset sin transacción (Bug crítico) | Alto | Bajo |
| P1-B | Cache no se invalida tras reset | Medio | Bajo |
| P1-C | Movimientos titular ignora filtro de fecha | Medio | Bajo |
| P4-C | Validar que desde <= hasta | Medio | Bajo |
| P4-B | Validar monto > 0 en frontend | Bajo | Bajo |
| P2-A | Campos opcionales colapsados | Bajo | Bajo |
| P3 | Reorganización visual de la página | Medio | Medio |
| P2-C | Sugerencias de concepto frecuentes | Bajo | Medio |
| P4-D | Límite rango Excel export | Bajo | Bajo |
| P4-E | Timezone pipeline (auditar) | Medio | Bajo |
| P4-F | Paginación panel movimientos | Bajo | Bajo |

---

## Archivos involucrados

| Archivo | Problemas |
|---|---|
| `backend/src/modules/admin/admin.service.js` | P1-A (transacción, FK_CHECKS) |
| `backend/src/modules/finanzas/finanzas.validation.js` | P4-C (validar desde <= hasta) |
| `frontend/src/pages/Finanzas/FinanzasPage.tsx` | P3 (reorganización visual) |
| `frontend/src/pages/Finanzas/MovimientosTitularPanel.tsx` | P1-C (filtro fecha), P4-F (paginación) |
| `frontend/src/pages/Finanzas/RegistrarMovimientoModal.tsx` | P2-A (colapsar opcionales), P4-B (validar monto) |
| `frontend/src/pages/Configuracion/ConfiguracionPage.tsx` | P1-B (cache tras reset) |
