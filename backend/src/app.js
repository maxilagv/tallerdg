const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pinoHttp = require("pino-http");

const config = require("./config");
const logger = require("./shared/logger");
const requestIdMiddleware = require("./shared/middleware/requestId.middleware");
const errorMiddleware = require("./shared/middleware/error.middleware");
const { getSchemaStatus } = require("./shared/db/schema.guard");

const adminRoutes = require("./modules/admin/admin.routes");
const authRoutes = require("./modules/auth/auth.routes");
const busquedaRoutes = require("./modules/busqueda/busqueda.routes");
const categoriasRoutes = require("./modules/categorias/categorias.routes");
const clientesRoutes = require("./modules/clientes/clientes.routes");
const configuracionRoutes = require("./modules/configuracion/configuracion.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const empleadosRoutes = require("./modules/empleados/empleados.routes");
const finanzasRoutes = require("./modules/finanzas/finanzas.routes");
const gastosRoutes = require("./modules/gastos/gastos.routes");
const ordenesRoutes = require("./modules/ordenes/ordenes.routes");
const pagosRoutes = require("./modules/pagos/pagos.routes");
const productosRoutes = require("./modules/productos/productos.routes");
const comprasRoutes    = require("./modules/compras/compras.routes");
const proveedoresRoutes = require("./modules/proveedores/proveedores.routes");
const ventasRapidasRoutes = require("./modules/ventas-rapidas/ventas_rapidas.routes");
const sueldosRoutes = require("./modules/sueldos/sueldos.routes");
const serviciosRoutes = require("./modules/servicios/servicios.routes");
const vehiculosRoutes = require("./modules/vehiculos/vehiculos.routes");
const deudasRoutes = require("./modules/deudas/deudas.routes");
const ofertasRoutes = require("./modules/ofertas/ofertas.routes");
const whatsappRoutes = require("./modules/whatsapp/whatsapp.routes");
const WhatsAppService = require("./modules/whatsapp/whatsapp.service");
const { iniciarCrons } = require("./shared/cron/cron.jobs");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestIdMiddleware);
app.use(pinoHttp({ logger }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      message: "Demasiadas solicitudes. Espera unos minutos.",
    },
  })
);

app.get("/api/health", async (req, res, next) => {
  try {
    const schema = await getSchemaStatus();
    const ok = schema.pending_count === 0;

    return res.status(ok ? 200 : 503).json({
      ok,
      timestamp: new Date().toISOString(),
      database: "ok",
      pending_migrations: schema.pending_migrations,
    });
  } catch (error) {
    return next(error);
  }
});

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/buscar", busquedaRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/configuracion", configuracionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/empleados", empleadosRoutes);
app.use("/api/finanzas", finanzasRoutes);
app.use("/api/gastos", gastosRoutes);
app.use("/api/ordenes", ordenesRoutes);
app.use("/api/pagos", pagosRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/compras",         comprasRoutes);
app.use("/api/proveedores",     proveedoresRoutes);
app.use("/api/ventas-rapidas",  ventasRapidasRoutes);
app.use("/api/sueldos",         sueldosRoutes);
app.use("/api/servicios", serviciosRoutes);
app.use("/api/vehiculos", vehiculosRoutes);
app.use("/api/deudas",  deudasRoutes);
app.use("/api/ofertas", ofertasRoutes);
app.use("/api/whatsapp", whatsappRoutes);

app.use((req, res) => {
  res.status(404).json({ ok: false, message: "Ruta no encontrada." });
});

app.use(errorMiddleware);

if (require.main === module) {
  (async () => {
    const schema = await getSchemaStatus();

    if (schema.pending_count > 0) {
      const payload = { pendingMigrations: schema.pending_migrations };

      if (config.nodeEnv === "production") {
        logger.fatal(payload, "El backend no puede arrancar con migraciones pendientes");
        process.exit(1);
      }

      logger.warn(payload, "Hay migraciones pendientes; algunas funciones pueden fallar");
    }

    if (process.env.NODE_ENV !== "test") {
      WhatsAppService.inicializar().catch((error) => {
        logger.warn({ error: error.message }, "No se pudo inicializar WhatsApp al arrancar");
      });
      iniciarCrons();
    }

    app.listen(config.port, () => {
      logger.info(`TallerPro backend corriendo en puerto ${config.port}`);
    });
  })().catch((error) => {
    logger.fatal({ err: error }, "No se pudo iniciar el backend");
    process.exit(1);
  });
}

module.exports = app;
