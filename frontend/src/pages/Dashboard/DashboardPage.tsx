import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ClipboardList, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { dashboardApi } from "../../features/dashboard/api";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { Skeleton } from "../../shared/ui/Skeleton";
import { useAuthStore } from "../../shared/store/authStore";
import { formatDate, formatMoney } from "../../shared/utils/format";

export function DashboardPage() {
  const empleado = useAuthStore((state) => state.empleado);

  const dashboardQuery = useQuery({
    queryKey: ["dashboard-hoy"],
    queryFn: () => dashboardApi.hoy(),
    refetchInterval: 60_000,
  });

  const dashboard = dashboardQuery.data?.data.data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text">Panel principal</h1>
        <p className="mt-1 text-sm text-text-muted">
          {formatDate(new Date())} · Hola, {empleado?.nombre}. Este es el estado operativo del taller hoy.
        </p>
      </div>

      {dashboardQuery.isLoading ? <DashboardLoading /> : null}

      {dashboardQuery.isError ? (
        <Card>
          <EmptyState
            title="No se pudo cargar el dashboard"
            description="Reintenta en unos segundos para volver a consultar el estado del taller."
            icon={AlertTriangle}
          />
        </Card>
      ) : null}

      {!dashboardQuery.isLoading && !dashboardQuery.isError ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Ingresos de hoy" value={formatMoney(dashboard?.ingresos_hoy || 0)} tone="green" />
            <KpiCard label="Trabajos abiertos" value={String(dashboard?.ordenes_abiertas.length || 0)} tone="blue" />
            <KpiCard label="Stock bajo" value={String(dashboard?.productos_stock_bajo || 0)} tone="red" />
            <KpiCard label="Creados hoy" value={String(dashboard?.ordenes_creadas_hoy || 0)} tone="gray" />
          </div>

          {dashboard?.productos_stock_bajo ? (
            <Card>
              <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-4">
                <AlertTriangle size={20} className="shrink-0 text-yellow-300" />
                <div>
                  <p className="font-medium text-yellow-200">
                    Hay {dashboard.productos_stock_bajo} producto(s) con stock bajo
                  </p>
                  <Link to="/productos?stock_bajo=true" className="text-sm text-yellow-300 underline">
                    Ver productos criticos
                  </Link>
                </div>
              </div>
            </Card>
          ) : null}

          {dashboard?.sueldos_vencidos ? (
            <Card>
              <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-4">
                <Wallet size={20} className="shrink-0 text-red-300" />
                <div>
                  <p className="font-medium text-red-200">
                    {dashboard.sueldos_vencidos === 1
                      ? "Hay 1 período de sueldo vencido pendiente de liquidar"
                      : `Hay ${dashboard.sueldos_vencidos} períodos de sueldo vencidos pendientes de liquidar`}
                  </p>
                  <Link to="/sueldos" className="text-sm text-red-300 underline">
                    Ir a Sueldos
                  </Link>
                </div>
              </div>
            </Card>
          ) : null}

          <Card>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
              <ClipboardList size={16} /> Trabajos en curso
            </h2>
            {dashboard?.ordenes_abiertas.length ? (
              <div className="mt-4 space-y-2">
                {dashboard.ordenes_abiertas.map((orden) => (
                  <Link
                    key={orden.id}
                    to={`/ordenes/${orden.id}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3 transition hover:bg-surface-3"
                  >
                    <div>
                      <p className="font-mono font-semibold text-primary">{orden.numero}</p>
                      <p className="text-sm text-text">
                        {orden.cliente_apellido}, {orden.cliente_nombre}
                      </p>
                      <p className="text-xs text-text-muted">
                        {orden.patente} · {orden.marca} {orden.modelo}
                      </p>
                    </div>
                    <span className="text-sm font-medium capitalize text-text">{orden.estado.replace("_", " ")}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-border bg-surface-2 px-4 py-6 text-sm text-text-muted">
                No hay trabajos abiertos en este momento.
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}

function DashboardLoading() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-20" />
          </Card>
        ))}
      </div>

      <Card>
        <Skeleton className="h-16 w-full" />
      </Card>

      <Card>
        <Skeleton className="h-6 w-40" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      </Card>
    </>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "red" | "blue" | "gray";
}) {
  const colorMap = {
    green: "text-green-300",
    red: "text-red-300",
    blue: "text-blue-300",
    gray: "text-text",
  };

  return (
    <Card>
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`mt-3 text-3xl font-bold ${colorMap[tone]}`}>{value}</p>
    </Card>
  );
}
