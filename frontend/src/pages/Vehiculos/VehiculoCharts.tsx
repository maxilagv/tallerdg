import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatDate, formatMoney } from "../../shared/utils/format";
import { Card } from "../../shared/ui/Card";

const COLORS = ["#3b82f6", "#f97316", "#22c55e", "#a855f7", "#ef4444", "#f59e0b", "#06b6d4", "#ec4899"];

interface OrdenHistorial {
  id: number;
  numero: string;
  total: number | string;
  km_entrada: number;
  closed_at?: string | null;
  created_at: string;
  servicios?: Array<{ servicio_nombre: string; subtotal: number }>;
  productos?: Array<{ producto_nombre: string; subtotal: number }>;
}

interface VehiculoChartsProps {
  historial: OrdenHistorial[];
}

export function VehiculoCharts({ historial }: VehiculoChartsProps) {
  if (!historial || historial.length < 2) {
    return (
      <Card>
        <p className="py-6 text-center text-sm text-text-muted">
          Se necesitan al menos 2 trabajos cerrados para mostrar los gráficos.
        </p>
      </Card>
    );
  }

  const montoPorVisita = historial
    .slice()
    .reverse()
    .map((orden) => ({
      fecha: formatDate(orden.closed_at || orden.created_at),
      numero: orden.numero,
      total: Number(orden.total),
    }));

  const kmEvolucion = historial
    .filter((orden) => orden.km_entrada > 0)
    .slice()
    .reverse()
    .map((orden) => ({
      fecha: formatDate(orden.closed_at || orden.created_at),
      km: orden.km_entrada,
    }));

  const servicioConteo = historial.reduce<Record<string, number>>((accumulator, orden) => {
    orden.servicios?.forEach((servicio) => {
      const key = servicio.servicio_nombre || "Servicio";
      accumulator[key] = (accumulator[key] || 0) + Number(servicio.subtotal || 0);
    });
    return accumulator;
  }, {});

  const tortaData = Object.entries(servicioConteo)
    .map(([nombre, valor]) => ({ nombre, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="mb-4 text-sm font-semibold text-text">Gasto por visita al taller</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={montoPorVisita} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null;
                }

                return (
                  <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg">
                    <p className="text-text-muted">{payload[0]?.payload?.numero}</p>
                    <p className="font-bold text-text">{formatMoney(Number(payload[0]?.value || 0))}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {kmEvolucion.length >= 2 ? (
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-text">Kilometraje registrado</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={kmEvolucion} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) {
                      return null;
                    }

                    return (
                      <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg">
                        <p className="text-text-muted">{payload[0]?.payload?.fecha}</p>
                        <p className="font-bold text-text">{payload[0]?.value?.toLocaleString("es-AR")} km</p>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="km" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: "#f97316" }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        ) : null}

        {tortaData.length ? (
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-text">Trabajos más realizados</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={tortaData} dataKey="valor" nameKey="nombre" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                  {tortaData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatMoney(Number(value))}
                  contentStyle={{ background: "#1e2433", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px" }}
                  formatter={(value) => (value.length > 20 ? `${value.slice(0, 20)}…` : value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
