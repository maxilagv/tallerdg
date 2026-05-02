import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  PlusCircle,
  Clock3,
  CalendarRange,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { finanzasApi } from "../../features/finanzas/api";
import type { CajaResetStatus, MovimientoFinanciero } from "../../features/finanzas/api";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { Skeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { FinanzasCharts } from "./FinanzasCharts";
import { MovimientosTitularPanel } from "./MovimientosTitularPanel";
import { IngresarDineroModal } from "./IngresarDineroModal";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function formatFechaCorta(fecha: string) {
  if (!fecha) return "";
  const [y, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function formatHora(value?: string | null) {
  if (!value) return "--:-- hs";
  const match = String(value).match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]} hs` : "--:-- hs";
}

type PeriodoRapido = "diario" | "semanal" | "quincenal" | "mensual" | "personalizado";

const PERIODOS: Array<{ key: PeriodoRapido; label: string }> = [
  { key: "diario", label: "Diario" },
  { key: "semanal", label: "Semanal" },
  { key: "quincenal", label: "Quincenal" },
  { key: "mensual", label: "Mensual" },
  { key: "personalizado", label: "Personalizado" },
];

// ── Componente principal ──────────────────────────────────────────────────────

export function FinanzasPage() {
  const { add } = useToast();
  const queryClient = useQueryClient();
  const hoy = formatLocalDate(new Date());
  const [periodo, setPeriodo] = useState<PeriodoRapido>("diario");
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [exporting, setExporting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [ingresoDineroOpen, setIngresoDineroOpen] = useState(false);
  const [confirmandoReset, setConfirmandoReset] = useState(false);

  const fechaInvalida = desde > hasta;
  const esVistaDiaria = !fechaInvalida && desde === hasta;

  const aplicarPeriodo = (nuevoPeriodo: PeriodoRapido) => {
    const base = new Date();
    setPeriodo(nuevoPeriodo);

    if (nuevoPeriodo === "diario") {
      const dia = formatLocalDate(base);
      setDesde(dia);
      setHasta(dia);
      return;
    }

    if (nuevoPeriodo === "semanal") {
      setDesde(formatLocalDate(addDays(base, -6)));
      setHasta(formatLocalDate(base));
      return;
    }

    if (nuevoPeriodo === "quincenal") {
      setDesde(formatLocalDate(addDays(base, -14)));
      setHasta(formatLocalDate(base));
      return;
    }

    if (nuevoPeriodo === "mensual") {
      setDesde(formatLocalDate(new Date(base.getFullYear(), base.getMonth(), 1)));
      setHasta(formatLocalDate(base));
    }
  };

  const resumenQuery = useQuery({
    queryKey: ["finanzas-resumen", desde, hasta],
    queryFn:  () => finanzasApi.resumen({ desde, hasta }),
    staleTime: 0,
    enabled:  !fechaInvalida,
  });

  const resetCajaQuery = useQuery({
    queryKey: ["finanzas-reset-caja"],
    queryFn:  finanzasApi.resetCajaEstado,
    staleTime: 30_000,
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

  const movimientosDiaQuery = useQuery({
    queryKey: ["finanzas-movimientos-detalle", desde, hasta],
    queryFn:  () => finanzasApi.movimientosDetalle({ desde, hasta }),
    staleTime: 0,
    enabled:  esVistaDiaria,
  });

  const resumen      = resumenQuery.data?.data.data;
  const porDia       = porDiaQuery.data?.data.data ?? { ingresos: [], gastos: [], compras: [] };
  const porCategoria = porCategoriaQuery.data?.data.data ?? [];
  const movimientosDia = movimientosDiaQuery.data?.data.data ?? [];

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

  const resetCajaMutation = useMutation({
    mutationFn: () => finanzasApi.resetCaja({ fecha: hoy }),
    onSuccess: () => {
      setConfirmandoReset(false);
      queryClient.invalidateQueries({ queryKey: ["finanzas-reset-caja"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-resumen"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-por-dia"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-categorias"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-movimientos-detalle"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-movimientos-titular"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-movimientos-mes"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-analisis"] });
      add("Caja iniciada en cero.", "success");
    },
    onError: (err) => add(getErrorMessage(err), "error"),
  });

  const cobrado      = resumen?.ingresos        ?? 0;
  const abonosDeuda  = resumen?.abonos_deuda_total ?? 0;
  const gastos       = resumen?.gastos          ?? 0;
  const compras      = resumen?.compras         ?? 0;
  const resultado    = resumen?.resultado_neto  ?? 0;
  const aportes      = resumen?.aportes_titular ?? 0;
  const retiros      = resumen?.retiros_titular ?? 0;
  const saldoCaja    = resumen?.saldo_efectivo  ?? 0;
  const cobrosEfectivo = resumen?.cobros_efectivo ?? 0;
  const abonosDeudaEfectivo = resumen?.abonos_deuda_efectivo ?? 0;
  const vrEfectivo     = resumen?.vr_efectivo     ?? 0;
  const gastosEfectivo = resumen?.gastos_efectivo ?? 0;
  const saldoInicial   = resumen?.saldo_efectivo_inicial ?? 0;
  const saldoArrastre  = resumen?.saldo_efectivo_arrastre ?? 0;
  const resetCaja      = resetCajaQuery.data?.data.data;
  const netoTitular  = aportes - retiros;
  const totalIngresosDia = useMemo(
    () => movimientosDia.filter((mov) => mov.tipo === "ingreso").reduce((sum, mov) => sum + Number(mov.monto), 0),
    [movimientosDia]
  );
  const totalEgresosDia = useMemo(
    () => movimientosDia.filter((mov) => mov.tipo === "egreso").reduce((sum, mov) => sum + Number(mov.monto), 0),
    [movimientosDia]
  );

  return (
    <div className="space-y-5">
      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text">Caja</h1>
          <p className="mt-1 text-sm text-text-muted">
            La caja diaria arranca en 0 y se arma con los movimientos del dia.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIngresoDineroOpen(true)} disabled={fechaInvalida}>
            <PlusCircle size={16} />
            Ingresar dinero
          </Button>
          <Button onClick={handleExport} loading={exporting} variant="secondary" disabled={fechaInvalida}>
            <Download size={16} />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* ── Filtro de período ────────────────────────────────────────────────── */}
      <Card>
        <p className="mb-3 text-sm font-medium text-text-muted">Período</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {PERIODOS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => aplicarPeriodo(item.key)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                periodo === item.key
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface-2 text-text-muted hover:text-text"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => { setDesde(e.target.value); setPeriodo("personalizado"); }}
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => { setHasta(e.target.value); setPeriodo("personalizado"); }}
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            />
          </div>
        </div>
        <CajaResetPanel
          estado={resetCaja}
          fecha={hoy}
          confirmando={confirmandoReset}
          loading={resetCajaMutation.isPending}
          onStart={() => setConfirmandoReset(true)}
          onCancel={() => setConfirmandoReset(false)}
          onConfirm={() => resetCajaMutation.mutate()}
        />
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
            abonosDeudaEfectivo={abonosDeudaEfectivo}
            vrEfectivo={vrEfectivo}
            gastosEfectivo={gastosEfectivo}
            saldoInicial={saldoInicial}
            saldoArrastre={saldoArrastre}
            cajaResetActivo={Boolean(resumen?.caja_reset_activo)}
          />

          {esVistaDiaria && (
            <MovimientosDiariosPanel
              fecha={desde}
              movimientos={movimientosDia}
              isLoading={movimientosDiaQuery.isLoading}
              isError={movimientosDiaQuery.isError}
              saldoInicial={saldoInicial}
              totalIngresos={totalIngresosDia}
              totalEgresos={totalEgresosDia}
            />
          )}

          {/* ── 2. Lo que hizo el taller ──────────────────────────────────────
              Tres números que cuentan la historia del período.
              Nunca se ven afectados por aportes o retiros del dueño.
          ─────────────────────────────────────────────────────────────────── */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
              Balance del periodo
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
                  {(resumen?.cantidad_abonos_deuda ?? 0) > 0 &&
                    ` · Deudas ${formatMoney(abonosDeuda)}`}
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
            desgloseDeudas={resumen?.desglose_metodos_deuda ?? []}
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
      <IngresarDineroModal
        open={ingresoDineroOpen}
        fechaInicial={desde}
        onClose={() => setIngresoDineroOpen(false)}
      />
    </div>
  );
}

// ── SaldoCajaCard ─────────────────────────────────────────────────────────────

function CajaResetPanel({
  estado,
  fecha,
  confirmando,
  loading,
  onStart,
  onCancel,
  onConfirm,
}: {
  estado?: CajaResetStatus;
  fecha: string;
  confirmando: boolean;
  loading: boolean;
  onStart: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const usado = Boolean(estado?.usado);

  return (
    <div className={`mt-4 rounded-xl border px-4 py-3 ${usado ? "border-green-500/25 bg-green-500/10" : "border-amber-500/25 bg-amber-500/10"}`}>
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${usado ? "bg-green-500/15" : "bg-amber-500/15"}`}>
            {usado ? (
              <ShieldCheck size={18} className="text-green-300" />
            ) : (
              <RotateCcw size={18} className="text-amber-300" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-text">
              {usado ? "Caja iniciada en cero" : "Iniciar caja en cero"}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {usado
                ? `Aplicado desde ${formatFechaCorta(estado?.fecha || fecha)}. Los datos anteriores siguen guardados.`
                : `Un solo uso: deja la caja desde ${formatFechaCorta(fecha)} en cero sin borrar clientes, ordenes, stock ni deudas.`}
            </p>
          </div>
        </div>

        {!usado && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {confirmando && (
              <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
                Cancelar
              </Button>
            )}
            <Button
              type="button"
              variant={confirmando ? "danger" : "secondary"}
              size="sm"
              onClick={confirmando ? onConfirm : onStart}
              loading={loading}
            >
              {confirmando ? "Confirmar reset" : "Iniciar en $0"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function getMovimientoLabel(mov: MovimientoFinanciero) {
  const labels: Record<string, string> = {
    cobro: "Ingreso por orden",
    abono_deuda: "Abono de deuda",
    venta_rapida: "Venta rapida",
    gasto: "Gasto",
    compra: "Compra",
    aporte_titular: "Ingreso manual",
    retiro_titular: "Retiro de caja",
  };
  return labels[mov.subtipo] ?? (mov.tipo === "ingreso" ? "Ingreso" : "Egreso");
}

function MovimientosDiariosPanel({
  fecha,
  movimientos,
  isLoading,
  isError,
  saldoInicial,
  totalIngresos,
  totalEgresos,
}: {
  fecha: string;
  movimientos: MovimientoFinanciero[];
  isLoading: boolean;
  isError: boolean;
  saldoInicial: number;
  totalIngresos: number;
  totalEgresos: number;
}) {
  const saldoFinal = saldoInicial + totalIngresos - totalEgresos;

  return (
    <Card>
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <CalendarRange size={15} className="text-primary" />
            <h2 className="text-base font-semibold text-text">Movimientos del dia</h2>
          </div>
          <p className="text-xs text-text-muted">
            {formatFechaCorta(fecha)} - ingresos y egresos ordenados por hora.
          </p>
        </div>
        <div className={`rounded-xl px-3 py-2 ${saldoFinal >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
          <p className="text-[10px] uppercase tracking-wide text-text-muted">Saldo final</p>
          <p className={`text-sm font-bold ${saldoFinal >= 0 ? "text-green-300" : "text-red-300"}`}>
            {saldoFinal >= 0 ? "+" : ""}{formatMoney(saldoFinal)}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-14 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <p className="rounded-xl border border-border bg-surface-2 px-4 py-5 text-center text-sm text-text-muted">
          No se pudieron cargar los movimientos del dia.
        </p>
      )}

      {!isLoading && !isError && movimientos.length === 0 && (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm font-medium text-text">Caja sin movimientos</p>
          <p className="mt-1 text-xs text-text-muted">El dia empieza en 0. Registra ventas, gastos o ingresos manuales.</p>
        </div>
      )}

      {!isLoading && !isError && movimientos.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-border">
            {movimientos.map((mov, index) => {
              const esIngreso = mov.tipo === "ingreso";
              const sign = esIngreso ? "+" : "-";
              return (
                <div
                  key={`${mov.subtipo}-${mov.referencia}-${mov.fecha_hora ?? index}`}
                  className="grid gap-3 border-b border-border/50 px-4 py-3 last:border-b-0 md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          esIngreso ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"
                        }`}
                      >
                        {getMovimientoLabel(mov)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                        <Clock3 size={12} />
                        {formatHora(mov.fecha_hora ?? mov.registrado_at)}
                      </span>
                    </div>
                    <p className="truncate text-sm font-medium text-text">{mov.descripcion || mov.referencia}</p>
                    <p className="truncate text-xs text-text-muted">{mov.referencia}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    {esIngreso ? (
                      <TrendingUp size={15} className="text-green-400" />
                    ) : (
                      <TrendingDown size={15} className="text-red-400" />
                    )}
                    <p className={`text-sm font-bold ${esIngreso ? "text-green-300" : "text-red-300"}`}>
                      {sign}{formatMoney(Number(mov.monto))}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-sm font-semibold text-text">Resumen del dia</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-surface-2/60 p-3">
              <p className="text-xs text-text-muted">Inicio de caja</p>
              <p className="mt-1 text-lg font-bold text-text">{formatMoney(saldoInicial)}</p>
            </div>
            <div className="rounded-xl bg-green-500/10 p-3">
              <p className="text-xs text-green-400">Total ingresado</p>
              <p className="mt-1 text-lg font-bold text-green-300">{formatMoney(totalIngresos)}</p>
            </div>
            <div className="rounded-xl bg-red-500/10 p-3">
              <p className="text-xs text-red-400">Total gastado</p>
              <p className="mt-1 text-lg font-bold text-red-300">{formatMoney(totalEgresos)}</p>
            </div>
            <div className={`rounded-xl p-3 ${saldoFinal >= 0 ? "bg-blue-500/10" : "bg-red-500/10"}`}>
              <p className={`text-xs ${saldoFinal >= 0 ? "text-blue-400" : "text-red-400"}`}>Saldo final del dia</p>
              <p className={`mt-1 text-lg font-bold ${saldoFinal >= 0 ? "text-blue-300" : "text-red-300"}`}>
                {saldoFinal >= 0 ? "+" : ""}{formatMoney(saldoFinal)}
              </p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function SaldoCajaCard({
  saldo,
  resultado,
  aportes,
  retiros,
  cobrosEfectivo,
  abonosDeudaEfectivo,
  vrEfectivo,
  gastosEfectivo,
  saldoInicial,
  saldoArrastre,
  cajaResetActivo,
}: {
  saldo:           number;
  resultado:       number;
  aportes:         number;
  retiros:         number;
  cobrosEfectivo:  number;
  abonosDeudaEfectivo: number;
  vrEfectivo:      number;
  gastosEfectivo:  number;
  saldoInicial:    number;
  saldoArrastre:   number;
  cajaResetActivo: boolean;
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
          Cobros y gastos en efectivo, mas tus aportes y retiros.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {cobrosEfectivo > 0 && (
            <div className="rounded-xl bg-surface-2/60 px-3 py-2">
              <p className="text-[10px] text-text-muted">Cobros efectivo</p>
              <p className="text-sm font-bold text-green-300">+{formatMoney(cobrosEfectivo)}</p>
            </div>
          )}
          {abonosDeudaEfectivo > 0 && (
            <div className="rounded-xl bg-surface-2/60 px-3 py-2">
              <p className="text-[10px] text-text-muted">Abonos deuda</p>
              <p className="text-sm font-bold text-green-300">+{formatMoney(abonosDeudaEfectivo)}</p>
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
          <div className="rounded-xl bg-surface-2/60 px-3 py-2">
            <p className="text-[10px] text-text-muted">
              {cajaResetActivo ? "Inicio por reset" : "Inicio del dia"}
            </p>
            <p className="text-sm font-bold text-text">{formatMoney(saldoInicial)}</p>
          </div>
          {saldoArrastre !== 0 && (
            <div className="rounded-xl bg-surface-2/60 px-3 py-2">
              <p className="text-[10px] text-text-muted">Arrastre ignorado</p>
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
  desgloseDeudas,
  desgloseVR,
}: {
  desgloseOrdenes: Array<{ metodo: string; total: number }>;
  desgloseDeudas:  Array<{ metodo: string; total: number }>;
  desgloseVR:      Array<{ metodo: string; total: number }>;
}) {
  const mapa: Record<string, number> = {};
  desgloseOrdenes.forEach(({ metodo, total }) => {
    mapa[metodo] = (mapa[metodo] || 0) + Number(total);
  });
  desgloseDeudas.forEach(({ metodo, total }) => {
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
