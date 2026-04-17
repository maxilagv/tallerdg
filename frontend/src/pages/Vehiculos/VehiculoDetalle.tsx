import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Car, ClipboardList, Gauge, User } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { vehiculosApi } from "../../features/vehiculos/api";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ErrorState } from "../../shared/ui/ErrorState";
import { Skeleton } from "../../shared/ui/Skeleton";
import { formatDate, formatMoney } from "../../shared/utils/format";
import { VehiculoCharts } from "./VehiculoCharts";

export function VehiculoDetalle() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const query = useQuery({
    queryKey: ["vehiculo", id],
    queryFn: () => vehiculosApi.obtener(Number(id)),
    enabled: Boolean(id),
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="No se encontró el vehículo"
        description="El vehículo que buscás no existe o fue eliminado."
        backTo="/vehiculos"
        backLabel="Ir a vehículos"
        onRetry={() => query.refetch()}
      />
    );
  }

  const vehiculo = query.data?.data.data;

  if (!vehiculo) {
    return <div className="text-text-muted">Vehículo no encontrado.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Volver
        </Button>
        <div>
          <div className="font-mono text-2xl font-bold text-accent">{vehiculo.patente}</div>
          <h1 className="text-xl font-bold text-text">
            {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio || ""}
          </h1>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <p className="text-xs text-text-muted">Visitas al taller</p>
          <p className="mt-2 text-2xl font-bold text-text">{vehiculo.stats?.total_visitas ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted">Total facturado</p>
          <p className="mt-2 text-2xl font-bold text-text">{formatMoney(vehiculo.stats?.total_facturado ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted">Último ingreso</p>
          <p className="mt-2 text-2xl font-bold text-text">
            {(vehiculo.km_ultimo_ingreso ?? 0).toLocaleString("es-AR")} km
          </p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted">Último service</p>
          <p className="mt-2 text-lg font-bold text-text">
            {vehiculo.stats?.ultima_visita ? formatDate(vehiculo.stats.ultima_visita) : "Sin datos"}
          </p>
        </Card>
      </div>

      {vehiculo.historial && vehiculo.historial.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-semibold text-text">Evolución histórica</h2>
          <VehiculoCharts historial={vehiculo.historial} />
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <h2 className="flex items-center gap-2 text-base font-semibold text-text">
            <User size={16} /> Propietario
          </h2>
          <button
            onClick={() => navigate(`/clientes/${vehiculo.cliente_id}`)}
            className="mt-4 text-left text-primary transition hover:underline"
          >
            {vehiculo.cliente_apellido}, {vehiculo.cliente_nombre}
          </button>
          <p className="mt-2 text-sm text-text-muted">{vehiculo.cliente_telefono || "Sin teléfono"}</p>
          <Button
            className="mt-4"
            size="sm"
            onClick={() => navigate(`/ordenes?nueva=1&clienteId=${vehiculo.cliente_id}&vehiculoId=${vehiculo.id}`)}
          >
            Nueva orden
          </Button>
        </Card>

        <Card className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-text-muted">Combustible</p>
              <div className="mt-1">
                <Badge variant="gray">{vehiculo.tipo_combustible}</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-text-muted">Km último ingreso</p>
              <p className="mt-1 text-lg font-semibold text-text">
                {(vehiculo.km_ultimo_ingreso ?? 0).toLocaleString("es-AR")} km
              </p>
            </div>
            <div>
              <p className="text-sm text-text-muted">Número de motor</p>
              <p className="mt-1 text-text">{vehiculo.numero_motor || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">Número de chasis</p>
              <p className="mt-1 text-text">{vehiculo.numero_chasis || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">Color</p>
              <p className="mt-1 text-text">{vehiculo.color || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">Visitas registradas</p>
              <p className="mt-1 text-text">{vehiculo.stats?.total_visitas ?? 0}</p>
            </div>
          </div>

          {vehiculo.observaciones ? (
            <div className="mt-5 border-t border-border pt-5">
              <p className="text-sm text-text-muted">Observaciones</p>
              <p className="mt-2 text-sm text-text">{vehiculo.observaciones}</p>
            </div>
          ) : null}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-text">
            <ClipboardList size={16} /> Historial de trabajos
          </h2>
          <Button
            size="sm"
            onClick={() => navigate(`/ordenes?nueva=1&clienteId=${vehiculo.cliente_id}&vehiculoId=${vehiculo.id}`)}
          >
            Nueva orden
          </Button>
        </div>

        {vehiculo.historial?.length ? (
          <div className="mt-4 space-y-2">
            {vehiculo.historial.map((orden) => (
              <button
                key={orden.id}
                onClick={() => navigate(`/ordenes/${orden.id}`)}
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-left transition hover:bg-surface-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm font-semibold text-primary">{orden.numero}</span>
                  <span className="font-semibold text-text">{formatMoney(orden.total)}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} /> {formatDate(orden.closed_at || orden.created_at)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Gauge size={12} /> {(orden.km_entrada || 0).toLocaleString("es-AR")} km
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Car size={12} /> {vehiculo.marca} {vehiculo.modelo}
                  </span>
                </div>
                {orden.notas_mecanico ? (
                  <p className="mt-2 truncate text-xs text-text-muted">{orden.notas_mecanico}</p>
                ) : null}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="Todavía no hay trabajos registrados"
              description="Los trabajos cerrados para este vehículo aparecerán aquí con toda la información."
              icon={ClipboardList}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
