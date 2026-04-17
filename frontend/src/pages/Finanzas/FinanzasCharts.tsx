import { useState } from "react";
import {
  ComposedChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card } from "../../shared/ui/Card";
import { formatMoney } from "../../shared/utils/format";

const PIE_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#22c55e",
  "#3b82f6", "#a855f7", "#06b6d4", "#ec4899",
];

type ChartType = "bar" | "line" | "area";

const CHART_TYPES: { key: ChartType; label: string }[] = [
  { key: "bar",  label: "Barras" },
  { key: "line", label: "Líneas" },
  { key: "area", label: "Área"   },
];

interface DiaData {
  dia:   string;
  total: number | string;
}

interface CategoriaData {
  categoria: string;
  total:     number | string;
}

interface FinanzasChartsProps {
  porDia: {
    ingresos: DiaData[];
    gastos:   DiaData[];
    compras:  DiaData[];
  };
  gastosPorCategoria: CategoriaData[];
}

export function FinanzasCharts({ porDia, gastosPorCategoria }: FinanzasChartsProps) {
  const [chartType, setChartType] = useState<ChartType>("bar");

  const diasMap: Record<
    string,
    { dia: string; ingresos: number; gastos: number; compras: number }
  > = {};

  const addSerie = (arr: DiaData[], campo: "ingresos" | "gastos" | "compras") => {
    arr.forEach((item) => {
      const key = String(item.dia).slice(5, 10);
      if (!diasMap[key]) diasMap[key] = { dia: key, ingresos: 0, gastos: 0, compras: 0 };
      diasMap[key][campo] += Number(item.total);
    });
  };

  addSerie(porDia.ingresos, "ingresos");
  addSerie(porDia.gastos,   "gastos");
  addSerie(porDia.compras,  "compras");

  const barData = Object.values(diasMap).sort((a, b) => a.dia.localeCompare(b.dia));

  const tortaData = gastosPorCategoria
    .map((item) => ({ nombre: item.categoria, valor: Number(item.total) }))
    .filter((item) => item.valor > 0);

  const customTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
        <p className="mb-1.5 font-semibold text-text">{String(label)}</p>
        {payload.map((item: any, i: number) => {
          const labels: Record<string, string> = {
            ingresos: "Ingresos",
            gastos:   "Gastos",
            compras:  "Compras",
          };
          const color = item.fill || item.stroke || item.color || "#fff";
          return (
            <p key={i} style={{ color }}>
              {labels[item.dataKey] ?? item.dataKey}: {formatMoney(item.value)}
            </p>
          );
        })}
      </div>
    );
  };

  const legendFormatter = (value: string) => {
    const m: Record<string, string> = {
      ingresos: "Ingresos (cobros + vtas. rápidas)",
      gastos:   "Gastos operativos",
      compras:  "Compras",
    };
    return m[value] ?? value;
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text">
              Ingresos · Gastos · Compras — por día
            </h3>
            <p className="text-xs text-text-muted">
              Verde = ingresos (cobros + ventas rápidas) · Naranja = compras · Rojo = gastos
            </p>
          </div>
          <div className="flex items-center gap-1 self-start rounded-xl border border-border bg-surface-2 p-1">
            {CHART_TYPES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setChartType(key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  chartType === key
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {barData.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">
            No hay datos en el período seleccionado.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart
              data={barData}
              margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
              barCategoryGap="25%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={customTooltip} />
              <Legend wrapperStyle={{ fontSize: "12px" }} formatter={legendFormatter} />

              {chartType === "bar" && <Bar dataKey="ingresos" fill="#22c55e" radius={[3, 3, 0, 0]} />}
              {chartType === "bar" && <Bar dataKey="compras"  fill="#f97316" radius={[3, 3, 0, 0]} />}
              {chartType === "bar" && <Bar dataKey="gastos"   fill="#ef4444" radius={[3, 3, 0, 0]} />}

              {chartType === "area" && <Area type="monotone" dataKey="ingresos" stroke="#22c55e" fill="#22c55e" fillOpacity={0.12} strokeWidth={2} />}
              {chartType === "area" && <Area type="monotone" dataKey="compras"  stroke="#f97316" fill="#f97316" fillOpacity={0.12} strokeWidth={2} />}
              {chartType === "area" && <Area type="monotone" dataKey="gastos"   stroke="#ef4444" fill="#ef4444" fillOpacity={0.12} strokeWidth={2} />}

              {chartType === "line" && <Line type="monotone" dataKey="ingresos" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: "#22c55e" }} />}
              {chartType === "line" && <Line type="monotone" dataKey="compras"  stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: "#f97316" }} />}
              {chartType === "line" && <Line type="monotone" dataKey="gastos"   stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: "#ef4444" }} />}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      {tortaData.length > 0 && (
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-text">
            Distribución de gastos operativos por categoría
          </h3>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={tortaData}
                dataKey="valor"
                nameKey="nombre"
                cx="50%"
                cy="50%"
                outerRadius={85}
                innerRadius={48}
                paddingAngle={2}
              >
                {tortaData.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatMoney(Number(value))}
                contentStyle={{
                  background:   "#1e2433",
                  border:       "1px solid #374151",
                  borderRadius: "8px",
                  fontSize:     "12px",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px" }}
                formatter={(value) =>
                  value.length > 24 ? `${value.slice(0, 24)}…` : value
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
