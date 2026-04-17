# Deploy Checklist

## Endpoints críticos a probar

### Auth

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Flujo principal

- `GET /api/clientes`
- `POST /api/clientes`
- `GET /api/vehiculos?clienteId=1`
- `POST /api/vehiculos`
- `POST /api/ordenes`
- `POST /api/ordenes/:id/servicios`
- `POST /api/ordenes/:id/productos`
- `PUT /api/ordenes/:id/estado`
- `GET /api/ordenes/:id/remito/pdf`

### Búsqueda

- `GET /api/buscar?q=ford`
- `GET /api/buscar?q=AB123`

### Finanzas y dashboard

- `GET /api/finanzas/resumen?desde=2026-01-01&hasta=2026-03-31`
- `GET /api/finanzas/por-dia?mes=3&anio=2026`
- `GET /api/dashboard/hoy`

### WhatsApp

- `GET /api/whatsapp/estado`
- `POST /api/whatsapp/conectar`
- `POST /api/whatsapp/desconectar`
- `GET /api/whatsapp/templates`
- `GET /api/whatsapp/log`

## Checklist de producción

### Backend

- Migraciones ejecutadas sin error.
- Seed inicial ejecutado si el entorno es nuevo.
- `JWT_SECRET` y `REFRESH_SECRET` generados con al menos 64 caracteres aleatorios.
- `FRONTEND_URL` apunta al dominio real del frontend.
- `COOKIE_SAMESITE=none` y `COOKIE_SECURE=true` si frontend y backend están en dominios distintos.
- `GET /api/health` responde `200`.

### Frontend

- `VITE_API_URL` apunta al backend público.
- `npm run build` compila sin error.
- Login de admin funciona.
- Flujo completo probado: cliente → vehículo → orden → cierre → PDF.
- Búsqueda por patente responde.
- Alertas de stock aparecen en dashboard y sidebar.

### WhatsApp

- Se visualiza el QR en `/whatsapp`.
- La conexión llega a estado `conectado`.
- Se puede enviar al menos una notificación automática al cerrar una orden.
- Los cron jobs quedan registrados en logs del backend.
