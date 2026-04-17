# TallerPro - Documento Maestro de Producto y Ejecucion

## 1. Proposito del documento

Este documento unifica dos cosas que no deben separarse:

- La vision del producto terminado que queremos vender.
- El plan de ejecucion realista para construirlo sin perder foco.

La idea central es simple: `TallerPro` no se construye como un sistema gigante desde el dia uno. Se construye por capas, pero con una arquitectura pensada desde el inicio para llegar al producto completo.

---

## 2. Vision del producto terminado

`TallerPro` es un sistema de gestion integral para talleres mecanicos que reemplaza Excel, centraliza la operacion y le da al dueno del taller control total del negocio desde una sola pantalla.

El producto terminado debe permitir:

- Encontrar cualquier cliente, patente u orden en segundos desde una lupa global siempre visible.
- Ver la ficha completa de cada vehiculo con historial, kilometraje, servicios realizados y proximos trabajos sugeridos.
- Gestionar ordenes de trabajo de punta a punta: apertura, diagnostico, mano de obra, productos usados, cierre y remito PDF.
- Controlar stock, compras, proveedores y alertas de faltantes.
- Registrar gastos, visualizar finanzas y entender el resultado del negocio.
- Gestionar empleados, roles y permisos por modulo.
- Automatizar comunicaciones por WhatsApp, recordatorios y avisos operativos.
- Configurar el sistema sin depender de soporte tecnico.

La promesa comercial del producto es esta:

> El mecanico escribe una patente y en segundos ve que se le hizo al auto, cuando, cuanto se cobro y que deberia revisarse proximamente.

Eso es lo que reemplaza al Excel. No solo guarda datos: acelera la operacion diaria del taller.

---

## 3. Principios del producto

Estos principios gobiernan tanto el diseno como la implementacion:

1. `La busqueda primero`
La lupa global vive siempre en la topbar. Antes de navegar, el usuario puede llegar directo a la entidad que necesita.

2. `Lenguaje humano`
El sistema le habla al taller en su idioma: cliente, auto, orden, remito, gasto, stock bajo.

3. `La ficha del vehiculo es el centro`
El historial del auto es una de las pantallas mas valiosas del producto.

4. `Operaciones en pocos clics`
Crear cliente, abrir orden, agregar productos, cerrar trabajo y descargar remito debe ser rapido.

5. `Feedback claro`
Todo guardado, error o carga debe tener respuesta visual y textual comprensible.

6. `Primero control operativo, despues automatizacion`
Si el taller todavia no puede operar el dia a dia sin Excel, no tiene sentido agregar WhatsApp, marketing o jobs complejos.

---

## 4. Estrategia general de construccion

La estrategia tecnica y de producto se divide en tres capas:

### 4.1 MVP vendible

Objetivo:
que el taller pueda dejar de usar Excel para la operacion principal.

Resultado esperado:

- clientes y vehiculos cargados
- busqueda por nombre o patente
- ordenes de trabajo completas
- stock basico
- remito PDF
- gastos y finanzas basicas
- empleados con login

### 4.2 Post-MVP operativo

Objetivo:
profundizar la operacion y ahorrar tiempo real.

Resultado esperado:

- agenda y turnos
- compras y proveedores completos
- importacion y exportacion Excel
- graficos del vehiculo
- mejores reportes financieros

### 4.3 Producto completo

Objetivo:
convertir el sistema en una plataforma integral y dificil de reemplazar.

Resultado esperado:

- WhatsApp y automatizaciones
- campanas y promociones
- configuracion maestra
- onboarding guiado
- health panel
- backups operativos
- notificaciones internas

---

## 5. Alcance cerrado del MVP v1

La regla del MVP es concreta:

> Todo lo que hace falta para que el taller pueda operar desde el sistema el primer dia.

### 5.1 Modulos dentro del MVP

- `Autenticacion`
  Login de admin y empleados, access token + refresh token, roles basicos.

- `Clientes`
  CRUD, busqueda interna, ficha del cliente y relacion con sus vehiculos.

- `Vehiculos`
  CRUD, patente normalizada, vinculacion al cliente, historial de ordenes.

- `Busqueda global`
  Busqueda por nombre, apellido, telefono y patente desde cualquier pantalla.

- `Servicios`
  Catalogo con categoria, nombre, precio base y tiempo estimado.

- `Productos`
  ABM con precio, stock, stock minimo y alerta visual.

- `Ordenes de trabajo`
  Crear, editar, agregar servicios, agregar productos, cambiar estado, cerrar.

- `Cobros basicos`
  Registrar pago manual de una orden, pago total o parcial, y calcular deuda simple por cliente.

- `Dashboard`
  Ordenes abiertas, ingresos/cobros del dia, stock bajo y actividad reciente.

- `Gastos`
  Registro manual con categoria, fecha, descripcion y monto.

- `Finanzas basicas`
  Facturado, cobrado, gastos y saldo del periodo.

- `Remito PDF`
  Generacion desde orden cerrada.

- `Empleados`
  CRUD basico, rol y acceso individual.

- `Configuracion basica`
  Nombre del taller, logo, telefono, direccion, CUIT y moneda.

### 5.2 Fuera del MVP

- WhatsApp y automatizaciones
- agenda y turnos
- compras y proveedores completos
- campanas y promociones
- importacion masiva desde Excel
- exportaciones avanzadas
- graficos del vehiculo
- graficos financieros avanzados
- onboarding guiado
- health panel
- backups descargables desde UI

### 5.3 Criterio de salida del MVP

El MVP esta listo cuando el taller puede:

- registrar clientes y vehiculos
- encontrar un auto por patente
- abrir y cerrar una orden
- consumir productos de stock
- registrar cobro y deuda
- emitir un remito PDF
- registrar gastos
- consultar lo facturado, lo cobrado y lo pendiente

Sin Excel.

---

## 6. Stack tecnologico objetivo

### 6.1 Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- React Router 7
- TanStack Query
- Axios
- Zustand
- React Hook Form + Zod

### 6.2 Backend

- Node.js 20 LTS
- Express 5
- CommonJS
- Knex.js
- MySQL 8
- JWT + refresh tokens
- Pino
- Zod
- Multer
- PDFKit

### 6.3 Integraciones futuras

- Redis
- BullMQ
- node-cron
- Cloudinary
- whatsapp-web.js o integracion equivalente

Nota:
Redis, BullMQ y WhatsApp quedan explicitamente fuera del MVP para no contaminar el setup inicial.

---

## 7. Arquitectura del sistema

### 7.1 Vista general

Frontend React:

- layout con sidebar y topbar
- busqueda global fija
- rutas protegidas
- datos sincronizados con React Query

Backend Express:

- routes
- controllers
- services
- repositories
- middlewares

Persistencia:

- MySQL como fuente principal
- Cloudinary para logos y fotos
- Redis solo en fases posteriores

### 7.2 Regla arquitectonica

El proyecto arranca como `monolito modular`.

Eso significa:

- una sola aplicacion frontend
- una sola API backend
- modulos separados por dominio
- sin microservicios
- sin sobrearquitectura

La separacion por modulo debe existir desde el dia uno:

- `auth`
- `clientes`
- `vehiculos`
- `busqueda`
- `servicios`
- `productos`
- `ordenes`
- `pagos`
- `gastos`
- `finanzas`
- `empleados`
- `remitos`
- `configuracion`

### 7.3 Flujo de autenticacion

- `POST /auth/login`
- access token corto en memoria
- refresh token en cookie httpOnly
- rotacion en `POST /auth/refresh`
- logout con revocacion del token actual

Politica inicial:

- multiples sesiones permitidas
- cada login genera un refresh token independiente
- cada logout revoca solo la sesion actual

---

## 8. Diseno funcional del producto completo

### 8.1 Modulos del producto final

`Busqueda global`
- resultados agrupados por clientes, vehiculos y ordenes
- debounce
- atajo de teclado
- navegacion directa

`Clientes`
- ficha completa
- historial agrupado por vehiculo
- deuda y segmentacion

`Vehiculos`
- ficha completa
- historial
- kilometraje
- fotos
- graficos en fase posterior

`Agenda y turnos`
- calendario diario y semanal
- asignacion por mecanico
- recordatorios

`Ordenes`
- flujo operativo completo
- panel lateral de historial
- estados del trabajo
- cierre con remito

`Productos y stock`
- catalogo
- movimientos
- minimos
- alertas

`Servicios`
- catalogo
- categorias
- precios
- tiempos estimados

`Proveedores y compras`
- fichas
- compras
- impacto en stock y finanzas

`Gastos y finanzas`
- egresos manuales
- resultados del periodo
- analitica avanzada en fases posteriores

`Empleados y roles`
- usuarios individuales
- permisos por modulo
- actividad

`WhatsApp y automatizaciones`
- confirmaciones
- recordatorios
- avisos operativos
- jobs en cola

`Configuracion`
- taller
- comunicaciones
- stock
- finanzas
- parametros del sistema

---

## 9. Modelo de datos v1

No se detalla aqui el SQL completo, pero si las entidades y reglas estructurales del sistema.

### 9.1 Seguridad y acceso

- `roles`
- `empleados`
- `refresh_tokens`

### 9.2 CRM y vehiculos

- `clientes`
- `vehiculos`

Reglas:

- `vehiculos.patente_normalizada` debe ser unica
- la patente se guarda tambien en formato visible
- soft-delete mediante `activo`

### 9.3 Catalogos

- `categorias`
- `servicios`
- `proveedores`
- `productos`

Reglas:

- dinero en `DECIMAL(12,2)`
- stock en `DECIMAL(10,2)` para soportar unidades fraccionables como litro o metro
- snapshot de precios al usar items en orden

### 9.4 Operacion del taller

- `ordenes`
- `orden_servicios`
- `orden_productos`
- `movimientos_stock`
- `remitos`

Reglas:

- numero de orden correlativo
- transiciones de estado validadas
- toda modificacion de stock genera movimiento
- el cierre de orden actualiza kilometraje del vehiculo

### 9.5 Cobros y finanzas

- `pagos`
- `categorias_gastos`
- `gastos`

Reglas:

- una orden puede tener multiples pagos
- cada orden tiene estado de cobro: `pendiente`, `parcial`, `pagada`
- `deuda del cliente = total cerrado - total cobrado`
- finanzas MVP distinguen `facturado` y `cobrado`

### 9.6 Configuracion

- `configuracion`

Reglas:

- clave unica
- lectura rapida por cache local en backend si hiciera falta

---

## 10. Reglas tecnicas clave

1. `Soft-delete por defecto`
No se borra historial real del negocio.

2. `Patente normalizada`
Siempre uppercase y sin espacios antes de persistir.

3. `Busqueda hibrida`
La busqueda por personas combina `FULLTEXT` con `LIKE` para soportar prefijos y errores comunes.

4. `Stock transaccional`
Agregar o quitar productos de una orden debe correr en transaccion DB para evitar stock negativo por concurrencia.

5. `Precios historicos inmutables`
Los items de una orden guardan el precio aplicado, no una referencia viva al catalogo.

6. `PDF no bloqueante`
Si el remito falla, la orden puede cerrarse igual y el PDF se regenera.

7. `Nada de localStorage para tokens`
Access token en memoria, refresh en cookie httpOnly.

8. `Primero operacion, despues automatizacion`
WhatsApp, BullMQ y cron no entran al MVP.

---

## 11. Plan maestro de ejecucion

La ejecucion se organiza en fases. Cada fase produce valor real y deja base para la siguiente.

## Fase 0 - Fundaciones

### Objetivo

Levantar el proyecto con autenticacion funcional, layout navegable y estructura modular estable.

### Incluye

- monorepo o estructura backend/frontend clara
- configuracion base de entorno
- migraciones iniciales
- seed de roles y admin
- login, refresh y logout
- rutas protegidas
- layout con sidebar y topbar
- componentes UI base

### Entregable

El admin entra al sistema, navega rutas vacias protegidas y la sesion se refresca automaticamente.

### Correspondencia con sprints

- `Sprint 0`

---

## Fase 1 - Base operativa

### Objetivo

Permitir que el taller cargue clientes, vehiculos y encuentre informacion rapido.

### Incluye

- CRUD de clientes
- CRUD de vehiculos
- normalizacion de patente
- ficha del cliente
- ficha del vehiculo
- busqueda global en topbar

### Entregable

Se puede cargar la base de trabajo y encontrar una persona o un auto desde la lupa.

### Correspondencia con sprints

- `Sprint 1`
- `Sprint 2`

---

## Fase 2 - Catalogos operativos

### Objetivo

Preparar servicios y productos para que las ordenes funcionen con datos reales.

### Incluye

- categorias
- servicios
- productos
- proveedor basico de referencia
- stock minimo
- alerta visual de stock bajo

### Entregable

El taller puede cargar sus servicios y su stock inicial.

### Correspondencia con sprints

- `Sprint 3`

---

## Fase 3 - Nucleo del taller

### Objetivo

Resolver el flujo principal del negocio: trabajo, insumos, cierre, historial y remito.

### Incluye

- ordenes de trabajo completas
- agregar servicios
- agregar productos con descuento automatico
- movimientos de stock
- cierre de orden
- kilometraje historico
- historial del vehiculo
- remito PDF
- cobros basicos

### Entregable

El taller abre una orden, trabaja, consume stock, cobra y cierra con remito.

### Correspondencia con sprints

- `Sprint 4`
- `Sprint 5`

---

## Fase 4 - Gestion interna

### Objetivo

Dar control de equipo y control economico minimo al dueno.

### Incluye

- empleados
- roles y permisos
- gastos
- finanzas basicas
- dashboard operativo
- configuracion basica

### Entregable

El dueno ve que esta abierto, que entro, que se cobro, que se debe y que stock falta.

### Correspondencia con sprints

- `Sprint 6`
- `Sprint 7`

---

## Fase 5 - Cierre de release

### Objetivo

Dejar el MVP listo para uso real en produccion.

### Incluye

- manejo de errores consistente
- validaciones completas
- loading states y skeletons
- responsive base
- pruebas de rutas criticas
- documentacion minima
- variables de produccion
- deploy
- backup operativo inicial

### Entregable

El sistema puede ponerse en manos del taller real y operar desde el dia uno.

### Correspondencia con sprints

- `Sprint 8`

---

## 12. Roadmap post-MVP

Una vez liberado el MVP, el producto sigue este orden de crecimiento:

## Fase 6 - Operacion asistida

- agenda y turnos
- graficos del vehiculo
- importacion y exportacion Excel
- compras y proveedores completos

## Fase 7 - Automatizacion

- Redis
- BullMQ
- node-cron
- integracion WhatsApp
- recordatorios y avisos automaticos

## Fase 8 - Inteligencia comercial y de negocio

- campanas y promociones
- segmentacion de clientes
- analitica financiera avanzada
- dashboards enriquecidos

## Fase 9 - Producto completo y pulido

- configuracion maestra
- onboarding guiado
- panel de salud
- notificaciones internas
- backup desde UI
- optimizacion final de rendimiento

---

## 13. Riesgos principales

### R1 - Scope creep

Riesgo:
el cliente pide WhatsApp, agenda y marketing antes de cerrar el MVP.

Mitigacion:
roadmap firmado y backlog separado en `MVP` y `post-MVP`.

### R2 - Patentes duplicadas

Riesgo:
`AB 123 GH` y `AB123GH` se cargan como vehiculos distintos.

Mitigacion:
normalizacion obligatoria + indice unico sobre `patente_normalizada`.

### R3 - Stock inconsistente

Riesgo:
dos usuarios descuentan el mismo producto al mismo tiempo.

Mitigacion:
transaccion DB y chequeo de stock disponible antes de confirmar.

### R4 - Finanzas engañosas

Riesgo:
confundir orden cerrada con dinero cobrado.

Mitigacion:
distinguir `facturado`, `cobrado` y `pendiente` desde el MVP.

### R5 - Baja adopcion

Riesgo:
el sistema es correcto tecnicamente pero incomodo para el taller.

Mitigacion:
UX simple, lenguaje humano, demo con datos reales y foco en flujos diarios.

### R6 - Perdida de datos

Riesgo:
no tener backup desde el primer deploy.

Mitigacion:
backup automatico operativo fuera de la UI desde el inicio de produccion.

### R7 - Dependencia futura de WhatsApp

Riesgo:
la automatizacion se vuelve fragil.

Mitigacion:
mantener WhatsApp desacoplado del flujo central y nunca bloquear operaciones core.

---

## 14. Definicion de exito

El proyecto va bien si al cerrar el MVP ocurre esto:

- el taller deja de usar Excel para clientes, autos y ordenes
- el dueno puede saber que se hizo, que se cobro y que se debe
- el personal encuentra rapido cualquier vehiculo
- el stock deja de manejarse de memoria
- la informacion del negocio queda centralizada y trazable

El proyecto estara realmente completo cuando, ademas de eso, el sistema tambien:

- recuerde tareas y servicios automaticamente
- gestione agenda y mensajes
- entregue analitica clara
- sea configurable por el propio taller

---

## 15. Proximo paso inmediato

Con este documento ya se puede arrancar la ejecucion real.

Orden recomendado:

1. congelar el alcance del MVP
2. inicializar repositorio y estructura
3. crear migraciones base
4. implementar Fase 0
5. trabajar sprint por sprint sin mezclar backlog futuro

---

## 16. Cierre

`TallerPro` no se plantea como un simple sistema administrativo. Se plantea como el sistema operativo del taller.

La vision final sigue siendo ambiciosa:
busqueda instantanea, historial completo, automatizaciones, finanzas y comunicacion.

Pero la ejecucion queda ordenada:
primero operacion, despues control, despues automatizacion, despues expansion.

Ese equilibrio entre vision y disciplina es lo que hace viable al producto.
