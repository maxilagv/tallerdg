import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Car, CreditCard } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { clientesApi } from "../../features/clientes/api";
import { estadoPagoMeta } from "../../features/pagos/api";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { ErrorState } from "../../shared/ui/ErrorState";
import { Skeleton } from "../../shared/ui/Skeleton";
import { formatDate, formatMoney } from "../../shared/utils/format";

export function ClienteDetalle() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const query = useQuery({
    queryKey: ["cliente", id],
    queryFn: () => clientesApi.obtener(Number(id)),
    enabled: Boolean(id),
  });

  const deudaQuery = useQuery({
    queryKey: ["cliente-deuda", id],
    queryFn: () => clientesApi.deuda(Number(id)),
    enabled: Boolean(id),
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="No se encontró el cliente"
        description="El cliente que buscás no existe o fue eliminado."
        backTo="/clientes"
        backLabel="Ir a clientes"
        onRetry={() => query.refetch()}
      />
    );
  }

  const cliente = query.data?.data.data;
  const deuda = deudaQuery.data?.data.data;

  if (!cliente) {
    return <div className="text-text-muted">Cliente no encontrado.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-text">
            {cliente.apellido}, {cliente.nombre}
          </h1>
          <p className="text-sm text-text-muted">Cliente desde {formatDate(cliente.created_at)}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <h2 className="text-base font-semibold text-text">Datos de contacto</h2>
          <div className="mt-4 space-y-2 text-sm text-text-muted">
            <div>Teléfono: {cliente.telefono || "-"}</div>
            <div>Email: {cliente.email || "-"}</div>
            <div>Dirección: {cliente.direccion || "-"}</div>
          </div>
          {cliente.notas ? <p className="mt-4 border-t border-border pt-4 text-sm text-text-muted">{cliente.notas}</p> : null}
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-text-muted" />
            <h2 className="text-base font-semibold text-text">Cuenta del cliente</h2>
          </div>

          {deudaQuery.isLoading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-wide text-text-muted">Total pendiente</p>
                <p className={`mt-2 text-3xl font-bold ${Number(deuda?.total_deuda || 0) > 0 ? "text-red-300" : "text-green-300"}`}>
                  {formatMoney(deuda?.total_deuda || 0)}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {deuda?.ordenes.length || 0} órdenes cerradas con saldo pendiente.
                </p>
              </div>

              {deuda?.ordenes.length ? (
                <div className="space-y-2">
                  {deuda.ordenes.slice(0, 4).map((orden) => (
                    <button
                      key={orden.id}
                      onClick={() => navigate(`/ordenes/${orden.id}`)}
                      className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-left transition hover:bg-surface-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-sm font-semibold text-primary">{orden.numero}</span>
                        <Badge variant={estadoPagoMeta[orden.estado_pago].variant}>
                          {estadoPagoMeta[orden.estado_pago].label}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-text-muted">
                        {orden.closed_at ? formatDate(orden.closed_at) : "Sin fecha de cierre"}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-text-muted">Cobrado {formatMoney(orden.total_pagado)}</span>
                        <span className="font-semibold text-red-300">{formatMoney(orden.saldo_pendiente)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-text-muted">
                  No tiene deuda pendiente.
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-text">
              <Car size={16} /> Vehículos
            </h2>
            <Button onClick={() => navigate(`/vehiculos?nuevo=1&clienteId=${cliente.id}`)} size="sm">
              Agregar auto
            </Button>
          </div>

          {cliente.vehiculos?.length ? (
            <div className="space-y-2">
              {cliente.vehiculos.map((vehiculo) => (
                <button
                  key={vehiculo.id}
                  onClick={() => navigate(`/vehiculos/${vehiculo.id}`)}
                  className="flex w-full items-center justify-between rounded-xl bg-surface-3 px-4 py-3 text-left transition hover:bg-surface-2"
                >
                  <div>
                    <div className="font-mono text-lg font-bold text-accent">{vehiculo.patente}</div>
                    <div className="text-sm text-text-muted">
                      {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio || ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted">
                      {(vehiculo.km_ultimo_ingreso || 0).toLocaleString("es-AR")} km
                    </span>
                    <Badge variant="gray">{vehiculo.tipo_combustible || "nafta"}</Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-text-muted">
              Este cliente todavía no tiene vehículos cargados.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
