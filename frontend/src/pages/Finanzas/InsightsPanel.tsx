import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import type { AnalisisCaja, NivelAlerta } from "../../features/finanzas/api";
import { Card } from "../../shared/ui/Card";
import { formatMoney } from "../../shared/utils/format";

// ── Config visual por nivel de alerta ────────────────────────────────────────

const NIVEL_CONFIG: Record<
  NivelAlerta,
  { Icon: React.ElementType; bg: string; border: string; iconCls: string; textCls: string }
> = {
  ok: {
    Icon:      CheckCircle2,
    bg:        "bg-green-500/8",
    border:    "border-green-500/20",
    iconCls:   "text-green-400",
    textCls:   "text-green-200",
  },
  info: {
    Icon:      Info,
    bg:        "bg-blue-500/8",
    border:    "border-blue-500/20",
    iconCls:   "text-blue-400",
    textCls:   "text-blue-200",
  },
  warning: {
    Icon:      AlertTriangle,
    bg:        "bg-yellow-500/8",
    border:    "border-yellow-500/20",
    iconCls:   "text-yellow-400",
    textCls:   "text-yellow-200",
  },
  danger: {
    Icon:      XCircle,
    bg:        "bg-red-500/8",
    border:    "border-red-500/20",
    iconCls:   "text-red-400",
    textCls:   "text-red-200",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFechaDia(fechaStr: string) {
  const date = new Date(fechaStr + "T12:00:00");
  return date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

// ── Stat Tile ─────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  sub,
  tone,
  Icon,
}: {
  label:  string;
  value:  string | number;
  sub?:   string;
  tone:   "green" | "blue" | "orange" | "red" | "teal" | "gray";
  Icon:   React.ElementType;
}) {
  const toneMap = {
    green:  { bg: "bg-green-500/10",  icon: "text-green-400",  val: "text-green-300"  },
    blue:   { bg: "bg-blue-500/10",   icon: "text-blue-400",   val: "text-blue-300"   },
    orange: { bg: "bg-orange-500/10", icon: "text-orange-400", val: "text-orange-300" },
    red:    { bg: "bg-red-500/10",    icon: "text-red-400",    val: "text-red-300"    },
    teal:   { bg: "bg-teal-500/10",   icon: "text-teal-400",   val: "text-teal-300"   },
    gray:   { bg: "bg-surface-3",     icon: "text-text-muted", val: "text-text"       },
  };
  const c = toneMap[tone];
  return (
    <div className={`rounded-xl ${c.bg} p-4`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={14} className={c.icon} />
        <p className="text-xs text-text-muted">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${c.val}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-text-muted">{sub}</p>}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function InsightsPanel({ data }: { data: AnalisisCaja }) {
  const {
    dias_con_actividad,
    dias_positivos,
    dias_abastecimiento,
    dias_perdida_operativa,
    promedio_ingreso_diario,
    mejor_dia,
    peor_dia_operativo,
    tendencia,
    alertas,
  } = data;

  const tendenciaCls =
    tendencia === "subiendo" ? "text-green-300" :
    tendencia === "bajando"  ? "text-red-300"   : "text-text-muted";

  const TendenciaIcon = tendencia === "subiendo" ? TrendingUp : tendencia === "bajando" ? TrendingDown : TrendingUp;

  return (
    <Card>
      {/* Encabezado */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15">
          <Zap size={17} className="text-violet-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text">Inteligencia de Caja</h2>
          <p className="text-xs text-text-muted">
            Análisis automático del período — el sistema lee tus números y te dice qué pasó.
          </p>
        </div>
      </div>

      {/* Grid de stats rápidas */}
      {dias_con_actividad > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <StatTile
            label="Días activos"
            value={dias_con_actividad}
            tone="gray"
            Icon={TendenciaIcon}
          />
          <StatTile
            label="Días positivos"
            value={dias_positivos}
            sub="Ganaste plata"
            tone="green"
            Icon={CheckCircle2}
          />
          <StatTile
            label="De abastecimiento"
            value={dias_abastecimiento}
            sub="Negativo por compras"
            tone="blue"
            Icon={ShoppingCart}
          />
          <StatTile
            label="Pérdida operativa"
            value={dias_perdida_operativa}
            sub={dias_perdida_operativa > 0 ? "Gastos > ingresos" : "Sin pérdidas"}
            tone={dias_perdida_operativa > 2 ? "red" : dias_perdida_operativa > 0 ? "orange" : "green"}
            Icon={AlertTriangle}
          />
          <StatTile
            label="Promedio diario"
            value={formatMoney(promedio_ingreso_diario)}
            sub="Ingreso por día activo"
            tone="teal"
            Icon={TrendingUp}
          />
          <div className={`rounded-xl bg-surface-3 p-4`}>
            <div className="mb-2 flex items-center gap-2">
              <TendenciaIcon size={14} className={tendenciaCls} />
              <p className="text-xs text-text-muted">Tendencia</p>
            </div>
            <p className={`text-lg font-bold capitalize ${tendenciaCls}`}>{tendencia}</p>
            <p className="mt-0.5 text-xs text-text-muted">1ª mitad vs 2ª</p>
          </div>
        </div>
      )}

      {/* Mejor y peor día */}
      {(mejor_dia || peor_dia_operativo) && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {mejor_dia && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/6 p-3">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-green-400/70">
                Mejor día del período
              </p>
              <p className="text-sm font-semibold capitalize text-text">
                {formatFechaDia(mejor_dia.fecha)}
              </p>
              <p className="text-xs text-text-muted">
                Ingresos: <span className="text-green-300">{formatMoney(mejor_dia.ingresos)}</span>
                {" · "}Neto: <span className="font-bold text-green-300">{formatMoney(mejor_dia.neto)}</span>
              </p>
            </div>
          )}
          {peor_dia_operativo && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/6 p-3">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-red-400/70">
                Peor día operativo
              </p>
              <p className="text-sm font-semibold capitalize text-text">
                {formatFechaDia(peor_dia_operativo.fecha)}
              </p>
              <p className="text-xs text-text-muted">
                Ingresos: <span className="text-text">{formatMoney(peor_dia_operativo.ingresos)}</span>
                {" · "}Gastos: <span className="text-red-300">{formatMoney(peor_dia_operativo.gastos)}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Alertas contextuales */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((alerta, i) => {
            const cfg = NIVEL_CONFIG[alerta.nivel];
            return (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${cfg.bg} ${cfg.border}`}
              >
                <cfg.Icon size={15} className={`mt-0.5 shrink-0 ${cfg.iconCls}`} />
                <p className={`text-sm leading-snug ${cfg.textCls}`}>{alerta.mensaje}</p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
