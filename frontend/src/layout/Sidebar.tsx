import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Car,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  HandCoins,
  Landmark,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircleMore,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  Wrench,
  Zap,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { authApi } from "../features/auth/api";
import { productosApi } from "../features/productos/api";
import { useAuthStore } from "../shared/store/authStore";
import { useAppNombre } from "../shared/hooks/useAppNombre";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  modulo: string | null;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Operaciones",
    items: [
      { to: "/dashboard",    label: "Inicio",        icon: LayoutDashboard, modulo: null },
      { to: "/ordenes",      label: "Trabajos",       icon: ClipboardList,   modulo: "ordenes" },
      { to: "/caja-rapida",  label: "Caja Rápida",    icon: Zap,             modulo: "productos" },
      { to: "/cobros",       label: "Cobros",         icon: CreditCard,      modulo: "cobros" },
    ],
  },
  {
    label: "Inventario",
    items: [
      { to: "/productos",    label: "Stock",          icon: Package,         modulo: "productos" },
      { to: "/compras",      label: "Compras",        icon: ShoppingCart,    modulo: "productos" },
      { to: "/proveedores",  label: "Proveedores",    icon: Truck,           modulo: "productos" },
    ],
  },
  {
    label: "Clientes",
    items: [
      { to: "/clientes",     label: "Clientes",       icon: Users,           modulo: "clientes" },
      { to: "/vehiculos",    label: "Vehículos",      icon: Car,             modulo: "vehiculos" },
      { to: "/deudas",       label: "Deudas",         icon: HandCoins,       modulo: "clientes" },
    ],
  },
  {
    label: "Caja",
    items: [
      { to: "/gastos",   label: "Gastos",  icon: Receipt,   modulo: "gastos"    },
      { to: "/caja",     label: "Caja",    icon: Landmark,  modulo: "finanzas"  },
      { to: "/sueldos",  label: "Sueldos", icon: Wallet,    modulo: "empleados" },
    ],
  },
  {
    label: "Configuración",
    items: [
      { to: "/servicios",    label: "Servicios",      icon: Wrench,          modulo: "servicios" },
      { to: "/empleados",    label: "Empleados",      icon: BriefcaseBusiness, modulo: "empleados" },
      { to: "/ofertas",      label: "Ofertas",        icon: Megaphone,       modulo: "configuracion" },
      { to: "/whatsapp",     label: "WhatsApp",       icon: MessageCircleMore, modulo: "whatsapp" },
      { to: "/configuracion",label: "Ajustes",        icon: Settings,        modulo: "configuracion" },
    ],
  },
];

// Todos los ítems aplanados para el modo colapsado (sin sección)
const allItems: NavItem[] = navSections.flatMap((s) => s.items);

export function Sidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const empleado = useAuthStore((state) => state.empleado);
  const hasPermiso = useAuthStore((state) => state.hasPermiso);
  const markUnauthenticated = useAuthStore((state) => state.markUnauthenticated);
  const canViewProductos = hasPermiso("productos");
  const appNombre = useAppNombre();

  const stockBajoQuery = useQuery({
    queryKey: ["sidebar-stock-bajo"],
    queryFn: () => productosApi.stockBajo(),
    enabled: canViewProductos,
    staleTime: 60_000,
  });

  const stockBajoCount = stockBajoQuery.data?.data.data.length ?? 0;

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // No bloquear salida local si falla el backend.
    } finally {
      markUnauthenticated();
      navigate("/login", { replace: true });
    }
  };

  const renderItem = (item: NavItem) => {
    if (item.modulo && !hasPermiso(item.modulo)) return null;
    const Icon = item.icon;
    const showStockBadge =
      (item.modulo === "productos" || item.to === "/caja-rapida") && stockBajoCount > 0;

    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) =>
          clsx(
            "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
            isActive
              ? "bg-primary/15 text-primary"
              : "text-text-muted hover:bg-surface-3 hover:text-text"
          )
        }
      >
        <Icon size={18} className="shrink-0" />
        {!collapsed ? (
          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
            <span className="truncate">{item.label}</span>
            {showStockBadge && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[11px] text-yellow-300">
                <AlertTriangle size={11} />
                {stockBajoCount}
              </span>
            )}
          </div>
        ) : showStockBadge ? (
          <span className="absolute ml-5 mt-[-12px] h-2.5 w-2.5 rounded-full bg-yellow-400" />
        ) : null}
      </NavLink>
    );
  };

  return (
    <aside
      className={clsx(
        "flex h-screen flex-col border-r border-border bg-surface/95 transition-all duration-300",
        collapsed ? "w-18" : "w-64"
      )}
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        {!collapsed ? (
          <span className="text-lg font-bold text-text">{appNombre}</span>
        ) : null}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="text-text-muted transition hover:text-text"
        >
          <ChevronLeft
            size={18}
            className={clsx("transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto p-2">
        {collapsed ? (
          // Modo colapsado: iconos sin secciones
          <div className="space-y-1">
            {allItems.map(renderItem)}
          </div>
        ) : (
          // Modo expandido: ítems agrupados en secciones
          <div className="space-y-4">
            {navSections.map((section) => {
              const visibleItems = section.items.filter(
                (item) => !item.modulo || hasPermiso(item.modulo)
              );
              if (visibleItems.length === 0) return null;

              return (
                <div key={section.label}>
                  <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted/60">
                    {section.label}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map(renderItem)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2">
        {!collapsed && empleado ? (
          <div className="px-3 py-2 text-xs text-text-muted">
            {empleado.nombre} {empleado.apellido}
          </div>
        ) : null}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-muted transition hover:bg-surface-3 hover:text-red-300"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed ? <span>Salir</span> : null}
        </button>
      </div>
    </aside>
  );
}
