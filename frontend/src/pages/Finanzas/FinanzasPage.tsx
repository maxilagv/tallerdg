import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  TrendingUp,
  TrendingDown,
  Banknote,
  Receipt,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { finanzasApi } from "../../features/finanzas/api";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { Skeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { FinanzasCharts } from "./FinanzasCharts";
import { MovimientosTitularPanel } from "./MovimientosTitularPanel";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── Componente principal ──────────────────────────────────────────────────────

export function FinanzasPage() {
  const { add } = useToast();
  const hoy = formatLocalDate(new Date());
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [exporting, setExporting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const fechaInvalida = desde > hasta;

  const resumenQuery = useQuery({
    queryKey: ["finanzas-resumen", desde, hasta],
    queryFn:  () => finanzasApi.resumen({ desde, hasta }),
    staleTime: 0,
    enabled:  !fechaInvalida,
  });

  const porDiaQuery = useQuery({
    queryKey: ["finanzas-por-dia", desde, hasta],
    queryFn:  () => finanzasApi.porDia({ desde, hasta }),
    staleTime: 0,
    enabled:  !fechaInvalida,
  });

  const porCategoriaQuery = useQuery({
    queryKey: ["finanzas-categorias", desde, hasta],
    queryFn:  () => finanzasApi.gastosPorCategoria({ desde, hasta }),
    staleTime: 0,
    enabled:  !fechaInvalida,
  });

  const resumen      = resumenQuery.data?.data.data;
  const porDia       = porDiaQuery.data?.data.data ?? { ingresos: [], gastos: [], compras: [] };
  const porCategoria = porCategoriaQuery.data?.data.data ?? [];

  const isLoading =
    resumenQuery.isLoading ||
    porDiaQuery.isLoading  ||
    porCategoriaQuery.isLoading;

  const isError =
    resumenQuery.isError ||
    porDiaQuery.isError  ||
    porCategoriaQuery.isError;

  const handleExport = async () => {
    if (fechaInvalida) return;
    setExporting(true);
    try {
      await finanzasApi.exportarExcel({ desde, hasta });
    } catch (err) {
      add(getErrorMessage(err), "error");
    } finally {
      setExporting(false);
    }
  };

  const cobrado      = resumen?.ingresos        ?? 0;
  const gastos       = resumen?.gastos          ?? 0;
  const compras      = resumen?.compras         ?? 0;
  const resultado    = resumen?.resultado_neto  ?? 0;
  const aportes      = resumen?.aportes_titular ?? 0;
  const retiros      = resumen?.retiros_titular ?? 0;
  const saldoCaja    = resumen?.saldo_efectivo  ?? 0;
  const cobrosEfectivo = resumen?.cobros_efectivo ?? 0;
  const vrEfectivo     = resumen?.vr_efectivo     ?? 0;
  const gastosEfectivo = resumen?.gastos_efectivo ?? 0;
  const saldoArrastre  = resumen?.saldo_efectivo_arrastre ?? 0;
  const netoTitular  = aportes - retiros;

  return (
    <div className="space-y-5">
      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text">Caja</h1>
          <p className="mt-1 text-sm text-text-muted">
            Todo lo que entró y salió en el período seleccionado.
          </p>
        </div>
        <Button onClick={handleExport} loading={exporting} variant="secondary" disabled={fechaInvalida}>
          <Download size={16} />
          Exportar Excel
        </Button>
      </div>

      {/* ── Filtro de período ────────────────────────────────────────────────── */}
      <Card>
        <p className="mb-3 text-sm font-medium text-text-muted">Período</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            />
          </div>
        </div>
        {/* Advertencia de fechas invertidas */}
        {fechaInvalida && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5">
            <AlertCircle size={14} className="shrink-0 text-red-400" />
            <p className="text-xs text-red-300">
              La fecha "Desde" no puede ser posterior a "Hasta". Corregí el período para ver los datos.
            </p>
          </div>
        )}
      </Card>

      {!fechaInvalida && isLoading && <CajaLoading />}

      {!fechaInvalida && isError && !isLoading && (
        <Card>
          <EmptyState
            title="No se pudo cargar la información"
            description="Verificá la conexión y volvé a intentar."
          />
        </Card>
      )}

      {!fechaInvalida && !isLoading && !isError && (
        <>
          {/* ── 1. Saldo en caja ──────────────────────────────────────────────
              El número más importante: cuánta plata hay (o debería haber)
              físicamente en la caja. Va primero para verlo de un vistazo.
          ─────────────────────────────────────────────────────────────────── */}
          <SaldoCajaCard
            saldo={saldoCaja}
            resultado={resultado}
            aportes={aportes}
            retiros={retiros}
            cobrosEfectivo={cobrosEfectivo}
            vrEfectivo={vrEfectivo}
            gastosEfectivo={gastosEfectivo}
            saldoArrastre={saldoArrastre}
          />

          {/* ── 2. Lo que hizo el taller ──────────────────────────────────────
              Tres números que cuentan la historia del período.
              Nunca se ven afectados por aportes o retiros del dueño.
          ─────────────────────────────────────────────────────────────────── */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
              Lo que hizo el taller
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Cobrado */}
              <Card>
                <div className="mb-2 flex items-center gap-2">
                  <TrendingUp size={14} className="text-green-400" />
                  <p className="text-xs text-text-muted">Cobrado</p>
                </div>
                <p className="text-3xl font-bold text-green-300">{formatMoney(cobrado)}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {resumen?.cantidad_cobros ?? 0} cobro{(resumen?.cantidad_cobros ?? 0) !== 1 ? "s" : ""} de órdenes
                  {(resumen?.cantidad_ventas_rapidas ?? 0) > 0 &&
                    ` · ${resumen!.cantidad_ventas_rapidas} venta${resumen!.cantidad_ventas_rapidas !== 1 ? "s" : ""} rápida${resumen!.cantidad_ventas_rapidas !== 1 ? "s" : ""}`}
                </p>
              </Card>

              {/* Gastado */}
              <Card>
                <div className="mb-2 flex items-center gap-2">
                  <Receipt size={14} className="text-red-400" />
                  <p className="text-xs text-text-muted">Gastado</p>
                </div>
                <p className="text-3xl font-bold text-red-300">{formatMoney(gastos + compras)}</p>
                <p className="mt-1 text-xs text-text-muted">
                  Gastos {formatMoney(gastos)}
                  {compras > 0 && <span> · Compras {formatMoney(compras)}</span>}
                </p>
              </Card>

              {/* Resultado del taller */}
              <Card>
                <div className="mb-2 flex items-center gap-2">
                  {resultado >= 0
                    ? <TrendingUp size={14} className="text-blue-400" />
                    : <TrendingDown size={14} className="text-red-400" />
                  }
                  <p className="text-xs text-text-muted">Resultado del taller</p>
                </div>
                <p className={`text-3xl font-bold ${resultado >= 0 ? "text-blue-300" : "text-red-300"}`}>
                  {resultado >= 0 ? "+" : ""}{formatMoney(resultado)}
                </p>
                <p className="mt-1 text-xs text-text-muted">Lo cobrado menos todo lo gastado</p>
              </Card>
            </div>
          </div>

          {/* ── 3. ¿Cómo cobró el taller? ─────────────────────────────────────
              Siempre visible; muestra "sin cobros" si no hay datos.
          ─────────────────────────────────────────────────────────────────── */}
          <MetodosPagoCard
            desgloseOrdenes={resumen?.desglose_metodos ?? []}
            desgloseVR={resumen?.desglose_metodos_vr ?? []}
          />

          {/* ── 4. Tus movimientos de caja (acordeón) ─────────────────────────
              Colapsado por defecto para no interrumpir la lectura.
              Al expandir muestra el CRUD completo filtrado por el período.
          ─────────────────────────────────────────────────────────────────── */}
          <div>
            <button
              type="button"
              onClick={() => setPanelOpen((o) => !o)}
              className="w-full text-left"
            >
              <Card>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15">
                      <Wallet size={17} className="text-violet-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-text">Tus movimientos de caja</h2>
                      <p className="text-xs text-text-muted">
                        {aportes === 0 && retiros === 0
                          ? "Sin movimientos en este período · Tocá para registrar"
                          : `Neto del período: ${netoTitular >= 0 ? "+" : ""}${formatMoney(netoTitular)}`
                        }
                      </p>
                    </div>
                  </div>
                  {panelOpen
                    ? <ChevronUp size={16} className="shrink-0 text-text-muted" />
                    : <ChevronDown size={16} className="shrink-0 text-text-muted" />
                  }
                </div>
              </Card>
            </button>

            {panelOpen && (
              <Card className="mt-2">
                <MovimientosTitularPanel desde={desde} hasta={hasta} />
              </Card>
            )}
          </div>

          {/* ── 5. Gráficos ───────────────────────────────────────────────────── */}
          <FinanzasCharts
            porDia={porDia}
            gastosPorCategoria={porCategoria}
          />
        </>
      )}
    </div>
  );
}

// ── SaldoCajaCard ─────────────────────────────────────────────────────────────

function SaldoCajaCard({
  saldo,
  resultado,
  aportes,
  retiros,
  cobrosEfectivo,
  vrEfectivo,
  gastosEfectivo,
  saldoArrastre,
}: {
  saldo:           number;
  resultado:       number;
  aportes:         number;
  retiros:         number;
  cobrosEfectivo:  number;
  vrEfectivo:      number;
  gastosEfectivo:  number;
  saldoArrastre:   number;
}) {
  const positivo   = saldo >= 0;
  const hayTitular = aportes > 0 || retiros > 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Efectivo físico en caja */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-6 ${
          positivo
            ? "border-green-500/30 bg-green-500/6"
            : "border-red-500/30 bg-red-500/6"
        }`}
      >
        <div className="mb-2 flex items-center gap-2">
          <Banknote size={16} className={positivo ? "text-green-400" : "text-red-400"} />
          <p className={`text-sm font-semibold ${positivo ? "text-green-400" : "text-red-400"}`}>
            Efectivo en caja
          </p>
        </div>

        <p className={`text-5xl font-black tracking-tight ${positivo ? "text-green-300" : "text-red-300"}`}>
          {positivo ? "+" : ""}{formatMoney(saldo)}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Cobros y gastos en efectivo, mÃ¡s tus aportes y retiros.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {cobrosEfectivo > 0 && (
            <div className="rounded-xl bg-surface-2/60 px-3 py-2">
              <p className="text-[10px] text-text-muted">Cobros efectivo</p>
              <p className="text-sm font-bold text-green-300">+{formatMoney(cobrosEfectivo)}</p>
            </div>
          )}
          {vrEfectivo > 0 && (
            <div className="rounded-xl bg-surface-2/60 px-3 py-2">
              <p className="text-[10px] text-text-muted">Caja rápida</p>
              <p className="text-sm font-bold text-green-300">+{formatMoney(vrEfectivo)}</p>
            </div>
          )}
          {gastosEfectivo > 0 && (
            <div className="rounded-xl bg-surface-2/60 px-3 py-2">
              <p className="text-[10px] text-text-muted">Gastos efectivo</p>
              <p className="text-sm font-bold text-red-300">-{formatMoney(gastosEfectivo)}</p>
            </div>
          )}
          {saldoArrastre !== 0 && (
            <div className="rounded-xl bg-surface-2/60 px-3 py-2">
              <p className="text-[10px] text-text-muted">Arrastre previo</p>
              <p className={`text-sm font-bold ${saldoArrastre >= 0 ? "text-blue-300" : "text-red-300"}`}>
                {saldoArrastre >= 0 ? "+" : ""}{formatMoney(saldoArrastre)}
              </p>
            </div>
          )}
          {aportes > 0 && (
            <div className="rounded-xl bg-surface-2/60 px-3 py-2">
              <div className="mb-0.5 flex items-center gap-1">
                <ArrowDownToLine size={10} className="text-violet-400" />
                <p className="text-[10px] text-text-muted">Pusiste</p>
              </div>
              <p className="text-sm font-bold text-violet-300">+{formatMoney(aportes)}</p>
            </div>
          )}
          {retiros > 0 && (
            <div className="rounded-xl bg-surface-2/60 px-3 py-2">
              <div className="mb-0.5 flex items-center gap-1">
                <ArrowUpFromLine size={10} className="text-purple-400" />
                <p className="text-[10px] text-text-muted">Sacaste</p>
              </div>
              <p className="text-sm font-bold text-purple-300">-{formatMoney(retiros)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Resultado del taller (todos los métodos) */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-6 ${
          resultado >= 0
            ? "border-blue-500/30 bg-blue-500/6"
            : "border-red-500/30 bg-red-500/6"
        }`}
      >
        <div className="mb-2 flex items-center gap-2">
          {resultado >= 0
            ? <TrendingUp size={16} className="text-blue-400" />
            : <TrendingDown size={16} className="text-red-400" />
          }
          <p className={`text-sm font-semibold ${resultado >= 0 ? "text-blue-400" : "text-red-400"}`}>
            Resultado del taller
          </p>
        </div>

        <p className={`text-5xl font-black tracking-tight ${resultado >= 0 ? "text-blue-300" : "text-red-300"}`}>
          {resultado >= 0 ? "+" : ""}{formatMoney(resultado)}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Todos los ingresos menos todos los egresos (todos los métodos de pago).
        </p>

        {hayTitular && (
          <p className="mt-3 text-xs text-text-muted">
            No incluye tus aportes ni retiros personales — esos sólo afectan el efectivo.
          </p>
        )}
      </div>
    </div>
  );
}

// ── MetodosPagoCard ───────────────────────────────────────────────────────────

const METODO_LABEL: Record<string, string> = {
  efectivo:         "Efectivo",
  transferencia:    "Transferencia",
  tarjeta_debito:   "Tarjeta Débito",
  tarjeta_credito:  "Tarjeta Crédito",
  tarjeta:          "Tarjeta",
  cheque:           "Cheque",
  cuenta_corriente: "Cuenta Cte.",
  otro:             "Otro",
};

const METODO_COLOR: Record<string, string> = {
  efectivo:         "text-green-300",
  transferencia:    "text-violet-300",
  tarjeta_debito:   "text-blue-300",
  tarjeta_credito:  "text-blue-300",
  tarjeta:          "text-blue-300",
  cheque:           "text-yellow-300",
  cuenta_corriente: "text-orange-300",
  otro:             "text-text",
};

function MetodosPagoCard({
  desgloseOrdenes,
  desgloseVR,
}: {
  desgloseOrdenes: Array<{ metodo: string; total: number }>;
  desgloseVR:      Array<{ metodo: string; total: number }>;
}) {
  const mapa: Record<string, number> = {};
  desgloseOrdenes.forEach(({ metodo, total }) => {
    mapa[metodo] = (mapa[metodo] || 0) + Number(total);
  });
  desgloseVR.forEach(({ metodo, total }) => {
    mapa[metodo] = (mapa[metodo] || 0) + Number(total);
  });
  const entries = Object.entries(mapa).filter(([, t]) => t > 0).sort(([, a], [, b]) => b - a);

  return (
    <Card>
      <h2 className="mb-3 text-base font-semibold text-text">¿Cómo cobró el taller?</h2>
      {entries.length === 0 ? (
        <p className="py-2 text-sm text-text-muted">Sin cobros registrados en el período.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([metodo, total]) => (
            <div
              key={metodo}
              className="flex items-center justify-between rounded-xl bg-surface-2/50 px-4 py-2.5"
            >
              <span className="text-sm text-text-muted">{METODO_LABEL[metodo] ?? metodo}</span>
              <span className={`text-sm font-bold ${METODO_COLOR[metodo] ?? "text-text"}`}>
                {formatMoney(total)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function CajaLoading() {
  return (
    <>
      <Card>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-3 h-12 w-48" />
        <div className="mt-4 flex gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-32 rounded-xl" />
          ))}
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-40" />
          </Card>
        ))}
      </div>
    </>
  );
}
