import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  CalendarDays,
  TrendingUp,
  ShoppingCart,
  Receipt,
  Zap,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { finanzasApi } from "../../features/finanzas/api";
import type { MovimientoFinanciero, SubtipoMovimiento } from "../../features/finanzas/api";
import { Card } from "../../shared/ui/Card";
import { formatMoney } from "../../shared/utils/format";

// ── Badge de método de pago ───────────────────────────────────────────────────
/**
 * Pastilla de color para mostrar de un vistazo cómo se cobró o pagó.
 * Se renderiza cuando el movimiento trae un mÃ©todo asociado.
 */
const METODO_BADGE: Record<string, { label: string; cls: string }> = {
  efectivo:         { label: "Efectivo",     cls: "bg-green-500/15 text-green-300 border-green-500/25" },
  tarjeta:          { label: "Tarjeta",      cls: "bg-blue-500/15 text-blue-300 border-blue-500/25"   },
  tarjeta_debito:   { label: "DÃ©bito",       cls: "bg-sky-500/15 text-sky-300 border-sky-500/25"     },
  tarjeta_credito:  { label: "CrÃ©dito",      cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25" },
  transferencia:    { label: "Transf.",      cls: "bg-violet-500/15 text-violet-300 border-violet-500/25" },
  cheque:           { label: "Cheque",       cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25" },
  cuenta_corriente: { label: "Cta. Cte.",   cls: "bg-orange-500/15 text-orange-300 border-orange-500/25" },
  otro:             { label: "Otro",         cls: "bg-surface-3 text-text-muted border-border"        },
};

function MetodoBadge({ metodo }: { metodo: string | null | undefined }) {
  if (!metodo) return null;
  const cfg = METODO_BADGE[metodo] ?? METODO_BADGE["otro"];
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ── Constantes ────────────────────────────────────────────────────────────────

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function agruparPorDia(movimientos: MovimientoFinanciero[]) {
  const mapa: Record<string, MovimientoFinanciero[]> = {};
  movimientos.forEach((m) => {
    const fecha = String(m.fecha).slice(0, 10);
    if (!mapa[fecha]) mapa[fecha] = [];
    mapa[fecha].push(m);
  });
  return Object.entries(mapa)
    .sort(([a], [b]) => b.localeCompare(a)) // más reciente primero
    .map(([fecha, movs]) => ({ fecha, movs }));
}

function formatFechaDia(fechaStr: string) {
  // "2026-03-18" → "Martes 18 de marzo"
  const date = new Date(fechaStr + "T12:00:00");
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
  });
}

/** Suma de movimientos de un subtipo específico */
function sumar(arr: MovimientoFinanciero[], subtipo: string) {
  return arr
    .filter((m) => m.subtipo === subtipo)
    .reduce((s, m) => s + Number(m.monto), 0);
}

/** Suma de todos los ingresos (cobros + ventas rápidas) */
function sumarIngresos(arr: MovimientoFinanciero[]) {
  return arr
    .filter((m) => m.tipo === "ingreso")
    .reduce((s, m) => s + Number(m.monto), 0);
}

// ── Configuración visual por subtipo ─────────────────────────────────────────

type SubtipoConfig = {
  label:      string;
  Icon:       React.ElementType;
  headerCls:  string;
  textCls:    string;
  amountCls:  string;
  sign:       "+" | "-";
};

/**
 * Cada entrada define cómo se muestra visualmente ese tipo de movimiento.
 * - cobro           → verde     → ingreso de orden de trabajo
 * - venta_rapida    → teal      → ingreso de caja rápida (sin orden)
 * - gasto           → rojo      → egreso operativo
 * - compra          → naranja   → egreso por compra a proveedor
 * - aporte_titular  → violeta   → dinero que metió el dueño (no operativo)
 * - retiro_titular  → morado    → dinero que sacó el dueño (no operativo)
 */
const SUBTIPO_CONFIG: Record<SubtipoMovimiento, SubtipoConfig> = {
  cobro: {
    label:     "Cobros de órdenes",
    Icon:      TrendingUp,
    headerCls: "bg-green-500/10",
    textCls:   "text-green-400",
    amountCls: "text-green-300",
    sign:      "+",
  },
  venta_rapida: {
    label:     "Ventas rápidas",
    Icon:      Zap,
    headerCls: "bg-teal-500/10",
    textCls:   "text-teal-400",
    amountCls: "text-teal-300",
    sign:      "+",
  },
  gasto: {
    label:     "Gastos operativos",
    Icon:      Receipt,
    headerCls: "bg-red-500/10",
    textCls:   "text-red-400",
    amountCls: "text-red-300",
    sign:      "-",
  },
  compra: {
    label:     "Compras a proveedores",
    Icon:      ShoppingCart,
    headerCls: "bg-orange-500/10",
    textCls:   "text-orange-400",
    amountCls: "text-orange-300",
    sign:      "-",
  },
  aporte_titular: {
    label:     "Aportes del titular",
    Icon:      ArrowDownToLine,
    headerCls: "bg-violet-500/10",
    textCls:   "text-violet-400",
    amountCls: "text-violet-300",
    sign:      "+",
  },
  retiro_titular: {
    label:     "Retiros del titular",
    Icon:      ArrowUpFromLine,
    headerCls: "bg-purple-500/10",
    textCls:   "text-purple-400",
    amountCls: "text-purple-300",
    sign:      "-",
  },
};

// ── Subcomponentes ────────────────────────────────────────────────────────────

/**
 * Resumen numérico del mes (barra superior del panel desplegado).
 * Muestra ingresos totales (cobros + VR), gastos, compras y resultado neto.
 */
function ResumenMes({
  ingresos,
  gastos,
  compras,
}: {
  ingresos: number;
  gastos:   number;
  compras:  number;
}) {
  const neto = ingresos - gastos - compras;
  return (
    <div className="grid grid-cols-2 gap-3 px-5 pt-4 md:grid-cols-4">
      <div className="rounded-xl bg-green-500/10 p-3">
        <p className="text-xs text-green-400">Ingresos totales</p>
        <p className="mt-1 text-lg font-bold text-green-300">{formatMoney(ingresos)}</p>
      </div>
      <div className="rounded-xl bg-red-500/10 p-3">
        <p className="text-xs text-red-400">Gastos operativos</p>
        <p className="mt-1 text-lg font-bold text-red-300">{formatMoney(gastos)}</p>
      </div>
      <div className="rounded-xl bg-orange-500/10 p-3">
        <p className="text-xs text-orange-400">Compras a proveedores</p>
        <p className="mt-1 text-lg font-bold text-orange-300">{formatMoney(compras)}</p>
      </div>
      <div className={`rounded-xl p-3 ${neto >= 0 ? "bg-blue-500/10" : "bg-red-500/10"}`}>
        <p className={`text-xs ${neto >= 0 ? "text-blue-400" : "text-red-400"}`}>
          Resultado neto
        </p>
        <p className={`mt-1 text-lg font-bold ${neto >= 0 ? "text-blue-300" : "text-red-300"}`}>
          {neto >= 0 ? "+" : ""}{formatMoney(neto)}
        </p>
      </div>
    </div>
  );
}

/** Sección de un tipo de movimiento dentro de un día (cabecera + lista de items) */
function SeccionTipo({
  subtipo,
  items,
}: {
  subtipo: SubtipoMovimiento;
  items:   MovimientoFinanciero[];
}) {
  const cfg   = SUBTIPO_CONFIG[subtipo];
  const total = items.reduce((s, m) => s + Number(m.monto), 0);

  return (
    <div>
      {/* Cabecera del tipo */}
      <div className={`flex items-center justify-between px-4 py-2 ${cfg.headerCls}`}>
        <div className="flex items-center gap-2">
          <cfg.Icon size={13} className={cfg.textCls} />
          <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.textCls}`}>
            {cfg.label}
          </span>
        </div>
        <span className={`text-xs font-bold ${cfg.amountCls}`}>
          {cfg.sign}{formatMoney(total)}
        </span>
      </div>

      {/* Lista de movimientos */}
      {items.map((mov, idx) => (
        <div
          key={idx}
          className="flex items-start justify-between border-b border-border/40 px-4 py-2.5 last:border-0 transition hover:bg-surface-2/40"
        >
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-medium text-text">{mov.referencia}</p>
              {/* Badge de método solo para ingresos con metodo_cobro */}
              <MetodoBadge metodo={mov.metodo_cobro} />
            </div>
            <p className="truncate text-xs text-text-muted">{mov.descripcion}</p>
          </div>
          <span className={`shrink-0 font-semibold text-sm ${cfg.amountCls}`}>
            {cfg.sign}{formatMoney(Number(mov.monto))}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Tarjeta de un día con todos sus movimientos agrupados.
 * El neto muestra ingresos (cobros + VR) − egresos (gastos + compras).
 */
function GrupoDia({ fecha, movs }: { fecha: string; movs: MovimientoFinanciero[] }) {
  const cobros         = movs.filter((m) => m.subtipo === "cobro");
  const ventasRapidas  = movs.filter((m) => m.subtipo === "venta_rapida");
  const gastos         = movs.filter((m) => m.subtipo === "gasto");
  const compras        = movs.filter((m) => m.subtipo === "compra");
  const aportesTitular = movs.filter((m) => m.subtipo === "aporte_titular");
  const retirosTitular = movs.filter((m) => m.subtipo === "retiro_titular");

  // Neto operativo del día (ingresos − gastos − compras, sin titular)
  const totalIngresos  = sumarIngresos(movs);
  const totalEgresos   = [...gastos, ...compras].reduce((s, m) => s + Number(m.monto), 0);
  const neto           = totalIngresos - totalEgresos;

  // ¿Hay movimientos del titular en este día?
  const hayTitular = aportesTitular.length > 0 || retirosTitular.length > 0;

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border">
      {/* Cabecera del día */}
      <div className="flex items-center justify-between bg-surface-2 px-4 py-3">
        <span className="text-sm font-semibold capitalize text-text">
          {formatFechaDia(fecha)}
        </span>
        <span
          className={`text-sm font-bold ${neto >= 0 ? "text-green-300" : "text-red-300"}`}
        >
          Neto op.: {neto >= 0 ? "+" : ""}{formatMoney(neto)}
        </span>
      </div>

      {/* Secciones operativas (sólo se renderizan si hay items) */}
      {cobros.length        > 0 && <SeccionTipo subtipo="cobro"        items={cobros}        />}
      {ventasRapidas.length > 0 && <SeccionTipo subtipo="venta_rapida" items={ventasRapidas} />}
      {gastos.length        > 0 && <SeccionTipo subtipo="gasto"        items={gastos}        />}
      {compras.length       > 0 && <SeccionTipo subtipo="compra"       items={compras}       />}

      {/* Separador + secciones del titular (no operativas) */}
      {hayTitular && (
        <div className="border-t border-dashed border-border/50">
          {aportesTitular.length > 0 && <SeccionTipo subtipo="aporte_titular" items={aportesTitular} />}
          {retirosTitular.length > 0 && <SeccionTipo subtipo="retiro_titular" items={retirosTitular} />}
        </div>
      )}
    </div>
  );
}

function SkeletonDia() {
  return (
    <div className="mb-4 animate-pulse overflow-hidden rounded-xl border border-border">
      <div className="bg-surface-2 px-4 py-3">
        <div className="h-4 w-48 rounded bg-surface-3" />
      </div>
      <div className="p-4 space-y-2">
        <div className="h-3 w-full rounded bg-surface-3" />
        <div className="h-3 w-3/4 rounded bg-surface-3" />
        <div className="h-3 w-5/6 rounded bg-surface-3" />
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function MovimientosMesPanel() {
  const hoy = new Date();
  const [abierto, setAbierto] = useState(false);
  const [mes,  setMes]  = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());

  const query = useQuery({
    queryKey: ["finanzas-movimientos-mes", mes, anio],
    queryFn:  () => finanzasApi.movimientosMes({ mes, anio }),
    enabled:  abierto,
    staleTime: 60_000,
  });

  const movimientos = query.data?.data.data ?? [];
  const grupos      = agruparPorDia(movimientos);

  // Totales del mes para el resumen superior
  const totalIngresos = sumarIngresos(movimientos);
  const totalGastos   = sumar(movimientos, "gasto");
  const totalCompras  = sumar(movimientos, "compra");

  const aniosDisponibles = Array.from({ length: 6 }, (_, i) => hoy.getFullYear() - i);

  return (
    <Card padding={false}>
      {/* ── Cabecera / botón del acordeón ──────────────────────────────────── */}
      <button
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-surface-2/60 rounded-xl"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <CalendarDays size={19} className="text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold text-text">
              Detalle mensual de movimientos
            </p>
            <p className="text-xs text-text-muted">
              {abierto
                ? `${MESES[mes - 1]} ${anio} — cobros, ventas rápidas, gastos y compras`
                : "Tocá para ver el detalle de cualquier mes"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 pl-4">
          {!abierto && (
            <span className="hidden rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary sm:inline">
              Ver detalle
            </span>
          )}
          {abierto
            ? <ChevronUp  size={18} className="text-text-muted" />
            : <ChevronDown size={18} className="text-text-muted" />}
        </div>
      </button>

      {/* ── Contenido desplegable ──────────────────────────────────────────── */}
      {abierto && (
        <div className="border-t border-border">
          {/* Selector de mes y año */}
          <div className="flex flex-wrap items-end gap-4 bg-surface-2/40 px-5 py-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-muted">Mes</label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="rounded-xl border border-border bg-surface-3 px-3 py-2 text-sm text-text outline-none transition focus:border-primary"
              >
                {MESES.map((nombre, i) => (
                  <option key={nombre} value={i + 1}>{nombre}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-muted">Año</label>
              <select
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                className="rounded-xl border border-border bg-surface-3 px-3 py-2 text-sm text-text outline-none transition focus:border-primary"
              >
                {aniosDisponibles.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <p className="pb-2 text-xs text-text-muted">
              Mostrando todos los movimientos de{" "}
              <strong className="text-text">{MESES[mes - 1]} {anio}</strong>
            </p>
          </div>

          {/* Loading */}
          {query.isLoading && (
            <div className="p-5">
              <SkeletonDia />
              <SkeletonDia />
              <SkeletonDia />
            </div>
          )}

          {/* Error */}
          {query.isError && !query.isLoading && (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-text-muted">
                No se pudo cargar la información. Verificá la conexión e intentá de nuevo.
              </p>
            </div>
          )}

          {/* Sin movimientos */}
          {!query.isLoading && !query.isError && grupos.length === 0 && (
            <div className="px-5 py-12 text-center">
              <p className="text-3xl">📋</p>
              <p className="mt-3 font-semibold text-text">
                Sin movimientos en {MESES[mes - 1]} {anio}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                No se registraron cobros, ventas rápidas, gastos ni compras en ese mes.
              </p>
            </div>
          )}

          {/* Contenido principal */}
          {!query.isLoading && !query.isError && grupos.length > 0 && (
            <>
              {/* Resumen del mes */}
              <ResumenMes
                ingresos={totalIngresos}
                gastos={totalGastos}
                compras={totalCompras}
              />

              {/* Grupos por día */}
              <div className="p-5 pt-4">
                {grupos.map(({ fecha, movs }) => (
                  <GrupoDia key={fecha} fecha={fecha} movs={movs} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
