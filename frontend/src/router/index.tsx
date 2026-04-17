import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "../layout/Layout";
import { ConfiguracionPage } from "../pages/Configuracion/ConfiguracionPage";
import { EmpleadosPage } from "../pages/Empleados/EmpleadosPage";
import { FinanzasPage } from "../pages/Finanzas/FinanzasPage";
import { GastosPage } from "../pages/Gastos/GastosPage";
import { LoginPage } from "../pages/Login/LoginPage";
import { DashboardPage } from "../pages/Dashboard/DashboardPage";
import { ClientesPage } from "../pages/Clientes/ClientesPage";
import { ClienteDetalle } from "../pages/Clientes/ClienteDetalle";
import { OrdenDetalle } from "../pages/Ordenes/OrdenDetalle";
import { OrdenesPage } from "../pages/Ordenes/OrdenesPage";
import { ProductosPage } from "../pages/Productos/ProductosPage";
import { ServiciosPage } from "../pages/Servicios/ServiciosPage";
import { VehiculosPage } from "../pages/Vehiculos/VehiculosPage";
import { VehiculoDetalle } from "../pages/Vehiculos/VehiculoDetalle";
import { ProveedoresPage } from "../pages/Proveedores/ProveedoresPage";
import { ProveedorDetalle } from "../pages/Proveedores/ProveedorDetalle";
import { ComprasPage } from "../pages/Compras/ComprasPage";
import { CobrosPage } from "../pages/Cobros/CobrosPage";
import { DeudasPage } from "../pages/Deudas/DeudasPage";
import { CajaRapidaPage } from "../pages/CajaRapida/CajaRapidaPage";
import { SueldosPage } from "../pages/Sueldos/SueldosPage";
import { OfertasPage } from "../pages/Ofertas/OfertasPage";
import { WhatsappPage } from "../pages/Whatsapp/WhatsappPage";
import { ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true,          element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard",    element: <DashboardPage /> },
      { path: "clientes",     element: <ClientesPage /> },
      { path: "clientes/:id", element: <ClienteDetalle /> },
      { path: "deudas",       element: <DeudasPage /> },
      { path: "vehiculos",    element: <VehiculosPage /> },
      { path: "vehiculos/:id",element: <VehiculoDetalle /> },
      { path: "ordenes",      element: <OrdenesPage /> },
      { path: "ordenes/:id",  element: <OrdenDetalle /> },
      { path: "cobros",       element: <CobrosPage /> },
      { path: "caja-rapida",  element: <CajaRapidaPage /> },
      { path: "sueldos",      element: <SueldosPage /> },
      { path: "servicios",    element: <ServiciosPage /> },
      { path: "productos",    element: <ProductosPage /> },
      { path: "gastos",       element: <GastosPage /> },
      { path: "proveedores",  element: <ProveedoresPage /> },
      { path: "proveedores/:id", element: <ProveedorDetalle /> },
      { path: "compras",      element: <ComprasPage /> },
      // Ruta principal del módulo Caja
      { path: "caja",         element: <FinanzasPage /> },
      // Redirect de compatibilidad: /finanzas → /caja (bookmarks, links viejos)
      { path: "finanzas",     element: <Navigate to="/caja" replace /> },
      { path: "empleados",    element: <EmpleadosPage /> },
      { path: "ofertas",      element: <OfertasPage /> },
      { path: "whatsapp",     element: <WhatsappPage /> },
      { path: "configuracion",element: <ConfiguracionPage /> },
    ],
  },
]);
