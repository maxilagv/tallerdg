import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Plus, Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ordenesApi, type Orden } from "../../features/ordenes/api";
import { estadoPagoMeta } from "../../features/pagos/api";
import { useDebounce } from "../../shared/hooks/useDebounce";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { TableSkeleton } from "../../shared/ui/Skeleton";
import { formatDate, formatMoney } from "../../shared/utils/format";
import { OrdenModal } from "./OrdenModal";

const estadoMeta: Record<Orden["estado"], { label: string; variant: "blue" | "yellow" | "orange" | "green" | "red" }> = {
  abierta: { label: "Abierta", variant: "blue" },
  en_proceso: { label: "En proceso", variant: "yellow" },
  lista: { label: "Lista", variant: "orange" },
  cerrada: { label: "Cerrada", variant: "green" },
  cancelada: { label: "Cancelada", variant: "red" },
};

export function OrdenesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const defaultClienteId = useMemo(() => {
    const value = searchParams.get("clienteId");
    return value ? Number(value) : null;
  }, [searchParams]);

  const defaultVehiculoId = useMemo(() => {
    const value = searchParams.get("vehiculoId");
    return value ? Number(value) : null;
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("nueva") === "1") {
      setModalOpen(true);
    }
  }, [searchParams]);

  const ordenesQuery = useQuery({
    queryKey: ["ordenes", page, debouncedSearch, estado],
    queryFn: () =>
      ordenesApi.listar({
        page,
        limit: 12,
        q: debouncedSearch || undefined,
        estado: estado || undefined,
      }),
  });

  const ordenes = ordenesQuery.data?.data.data.rows ?? [];
  const total = ordenesQuery.data?.data.data.total ?? 0;

  const closeModal = () => {
    setModalOpen(false);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("nueva");
    nextParams.delete("clienteId");
    nextParams.delete("vehiculoId");
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text">Órdenes de trabajo</h1>
          <p className="mt-1 text-sm text-text-muted">
            Flujo operativo del taller con servicios, repuestos, estados y seguimiento por vehículo.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nueva orden
        </Button>
      </div>

      <Card>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por número, patente o cliente..."
              className="w-full rounded-xl border border-border bg-surface-3 px-10 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            />
          </div>

          <select
            value={estado}
            onChange={(event) => {
              setEstado(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
          >
            <option value="">Todos los estados</option>
            <option value="abierta">Abiertas</option>
            <option value="en_proceso">En proceso</option>
            <option value="lista">Lista</option>
            <option value="cerrada">Cerradas</option>
            <option value="cancelada">Canceladas</option>
          </select>
        </div>
      </Card>

      <Card padding={false}>
        {ordenesQuery.isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={6} />
          </div>
        ) : ordenes.length === 0 ? (
          <EmptyState
            title="No hay órdenes para mostrar"
            description={
              search || estado
                ? "No encontramos trabajos con los filtros elegidos."
                : "Creá la primera orden de trabajo para empezar a registrar reparaciones."
            }
            action={
              search || estado
                ? undefined
                : {
                    label: "Crear orden",
                    onClick: () => setModalOpen(true),
                  }
            }
          />
        ) : (
          <>
            {/* Vista mobile: tarjetas tapeables */}
            <div className="divide-y divide-border/60 md:hidden">
              {ordenes.map((orden) => {
                const esDeuda = orden.estado === "cerrada" && Number(orden.saldo_pendiente) > 0;
                return (
                  <button
                    key={orden.id}
                    onClick={() => navigate(`/ordenes/${orden.id}`)}
                    className={`w-full px-4 py-3 text-left transition active:bg-surface-2 ${
                      esDeuda ? "bg-red-500/[0.04]" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono font-semibold text-primary">{orden.numero}</span>
                      <Badge variant={estadoMeta[orden.estado].variant}>{estadoMeta[orden.estado].label}</Badge>
                    </div>
                    <div className="mt-1 font-medium text-text">
                      {orden.cliente_apellido}, {orden.cliente_nombre}
                    </div>
                    <div className="text-xs text-text-muted">
                      {orden.patente} · {orden.marca} {orden.modelo}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={estadoPagoMeta[orden.estado_pago].variant}>
                          {estadoPagoMeta[orden.estado_pago].label}
                        </Badge>
                        {esDeuda && (
                          <span className="text-xs font-semibold text-red-400">
                            Deuda {formatMoney(orden.saldo_pendiente)}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-text">{formatMoney(orden.total)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Vista desktop: tabla completa */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
                    <th className="px-4 py-3">Orden</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Vehículo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Cobro</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenes.map((orden) => {
                    const esDeuda = orden.estado === "cerrada" && Number(orden.saldo_pendiente) > 0;
                    return (
                    <tr
                      key={orden.id}
                      className={`border-b transition hover:bg-surface-2 ${
                        esDeuda
                          ? "border-red-500/20 bg-red-500/[0.04]"
                          : "border-border/60"
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-primary">{orden.numero}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">
                          {orden.cliente_apellido}, {orden.cliente_nombre}
                        </div>
                        <div className="text-xs text-text-muted">{orden.cliente_telefono || "Sin teléfono"}</div>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {orden.patente} · {orden.marca} {orden.modelo}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={estadoMeta[orden.estado].variant}>{estadoMeta[orden.estado].label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Badge variant={estadoPagoMeta[orden.estado_pago].variant}>
                            {estadoPagoMeta[orden.estado_pago].label}
                          </Badge>
                          <span className={`text-xs ${esDeuda ? "font-semibold text-red-400" : "text-text-muted"}`}>
                            {esDeuda ? "Deuda" : "Saldo"} {formatMoney(orden.saldo_pendiente)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-text">{formatMoney(orden.total)}</div>
                        <div className="text-xs text-text-muted">Cobrado {formatMoney(orden.total_pagado)}</div>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{formatDate(orden.closed_at || orden.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/ordenes/${orden.id}`)}>
                            <Eye size={15} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {total > 12 ? (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
                <span className="text-text-muted">
                  Mostrando {(page - 1) * 12 + 1} - {Math.min(page * 12, total)} de {total}
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page * 12 >= total}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <OrdenModal
        open={modalOpen}
        onClose={closeModal}
        defaultClienteId={defaultClienteId}
        defaultVehiculoId={defaultVehiculoId}
        onCreated={(ordenId) => {
          navigate(`/ordenes/${ordenId}`);
        }}
      />
    </div>
  );
}
