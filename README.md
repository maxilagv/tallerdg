# TallerPro

Monorepo de `TallerPro` con implementación completa de:

- Fase 0: setup, autenticación, layout base y seguridad
- Fase 1: clientes y vehículos
- Fase 2: búsqueda global
- Fase 3: catálogos, servicios y productos
- Fase 4: órdenes de trabajo y stock transaccional
- Fase 5: historial del vehículo y remitos PDF
- Fase 6: empleados, roles y gastos
- Fase 7: finanzas y dashboard operativo
- Fase 8: configuración del taller y logo
- Fase 9: polish crítico, gráficos, importación Excel y entorno frontend
- Fase 10: WhatsApp, cron jobs y cierre de release

## Estructura

- `backend/`: API Express + MySQL + Knex
- `frontend/`: React + TypeScript + Vite + Tailwind
- `docs/`: checklist operativa y soporte de deploy

## Arranque rápido

### Backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

### Frontend

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

## Credenciales iniciales

- email: `admin@tallerpro.com`
- password: `admin1234`

## Variables de entorno

### Backend

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`, `REFRESH_SECRET`
- `FRONTEND_URL`
- `COOKIE_SAMESITE`, `COOKIE_SECURE`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### Frontend

- `VITE_API_URL`: URL pública del backend, por ejemplo `https://mi-api.com`

## Funcionalidades destacadas

- Búsqueda global por cliente, patente y trabajos abiertos.
- Ficha de vehículo con historial, stats y gráficos.
- Órdenes con stock transaccional, remito PDF y cierre operativo.
- Finanzas con KPIs, gráficos y movimientos.
- Configuración del taller con autosave y subida de logo.
- Importación masiva de productos y servicios desde Excel.
- Módulo de WhatsApp con QR, templates editables, log y cron jobs.

## Deploy sugerido

- Backend: Railway, Render o VPS con Node 20 y MySQL 8
- Frontend: Vercel o Netlify
- Cloudinary: almacenamiento de logo e imágenes

## Producción

- `backend/.env.production`: plantilla de variables del backend
- `frontend/.env.production`: plantilla de variables del frontend
- `docs/DEPLOY-CHECKLIST.md`: pruebas mínimas y checklist de salida
