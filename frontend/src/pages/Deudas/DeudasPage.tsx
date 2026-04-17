import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronDown, ChevronUp, Plus, Trash2, Wallet, Wrench } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { deudasApi, type Deuda } from "../../features/deudas/api";
import { useAuthStore } from "../../shared/store/authStore";
import { useConfirm } from "../../shared/hooks/useConfirm";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { EmptyState } from "../../shared/ui/EmptyState";
import { Skeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { formatDate, formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { NuevaDeudaModal } from "./NuevaDeudaModal";
import { AbonarDeudaModal } from "./AbonarDeudaModal";

const estadoVariant: Record<Deuda["estado"], "red" | "yellow" | "green"> = {
  pendiente: "red",
  parcial: "yellow",
  pagada: "green",
};

const estadoLabel: Record<Deuda["estado"], string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  pagada: "Pagada",
};

function ClienteDeudaRow({ clienteId, nombre, apellido, cantidadDeudas, totalDeuda, canWrite }: {
  clienteId: number;
  nombre: string;
  apellido: string;
  cantidadDeudas: number;
  totalDeuda: number;
  canWrite: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [abonarDeuda, setAbonarDeuda] = useState<Deuda | null>(null);
  const { confirm, confirmModalProps } = useConfirm();
  const { add } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const deudasQuery = useQuery({
    queryKey: ["deudas", "por-cliente", clienteId],
    queryFn: () => deudasApi.listar({ cliente_id: clienteId, limit: 50 }),
    enabled: expanded,
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => deudasApi.eliminar(id),
    onSuccess: () => {
      add("Deuda eliminada.");
      queryClient.invalidateQueries({ queryKey: ["deudas"] });
    },
    onError: (err) => add(getErrorMessage(err), "error"),
  });

  const deudas = deudasQuery.data?.data.data.rows ?? [];

  const handleEliminar = async (d: Deuda) => {
    const ok = await confirm({
      title: "Eliminar deuda",
      description: `¿Eliminás la deuda "${d.concepto}" de ${formatMoney(d.saldo)} pendientes?`,
      confirmLabel: "Eliminar",
      variant: "danger",
    });
    if (ok) eliminarMutation.mutate(d.id);
  };

  return (
    <>
      <ConfirmModal {...confirmModalProps} />
      <NuevaDeudaModal open={nuevaOpen} onClose={() => setNuevaOpen(false)} defaultClienteId={clienteId} />
      <AbonarDeudaModal deuda={abonarDeuda} open={Boolean(abonarDeuda)} onClose={() => setAbonarDeuda(null)} />

      <div className="rounded-xl border border-border bg-surface-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-surface-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15">
              <span className="text-sm font-bold text-red-400">{apellido[0]}</span>
            </div>
            <div>
              <p className="font-medium text-text">{apellido}, {nombre}</p>
              <p className="text-xs text-text-muted">
                {cantidadDeudas} deuda{cantidadDeudas !== 1 ? "s" : ""} ·{" "}
                <span className="text-red-400 font-semibold">{formatMoney(totalDeuda)}</span> pendientes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/clientes/${clienteId}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-primary transition hover:underline"
            >
              Ver cliente
            </Link>
            {expanded ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-border px-4 pb-3 pt-2">
            {deudasQuery.isLoading ? (
              <div className="space-y-2 py-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : deudas.length === 0 ? (
              <p className="py-3 text-center text-sm text-text-muted">Sin deudas activas</p>
            ) : (
              <div className="divide-y divide-border">
                {deudas.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {d.tipo === "orden" && <Wrench size={14} className="text-primary" />}
                        <p className="truncate text-sm font-medium text-text">{d.concepto}</p>
                        <Badge variant={estadoVariant[d.estado]}>{estadoLabel[d.estado]}</Badge>
                      </div>
                      <p className="text-xs text-text-muted">
                        {formatDate(d.fecha)} ·{" "}
                        Total: {formatMoney(d.monto_original)}{" "}
                        {d.monto_pagado > 0 && (
                          <> · Pagado: <span className="text-green-400">{formatMoney(d.monto_pagado)}</span></>
                        )}{" "}
                        · Saldo: <span className="font-semibold text-red-400">{formatMoney(d.saldo)}</span>
                      </p>
                    </div>
                    {canWrite && d.estado !== "pagada" && (
                      <div className="flex items-center gap-1">
                        {d.tipo === "orden" ? (
                          <Button size="sm" variant="secondary" onClick={() => navigate(`/ordenes/${d.id}`)}>
                            Ver orden
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => setAbonarDeuda(d)}>
                              Abonar
                            </Button>
                            <button
                              type="button"
                              onClick={() => handleEliminar(d)}
                              className="rounded-lg p-1.5 text-text-muted transition hover:bg-red-500/10 hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canWrite && (
              <button
                type="button"
                onClick={() => setNuevaOpen(true)}
                className="mt-2 flex items-center gap-1.5 text-xs text-primary transition hover:underline"
              >
                <Plus size={12} />
                Agregar deuda a este cliente
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export function DeudasPage() {
  const hasPermiso = useAuthStore((state) => state.hasPermiso);
  const canWrite = hasPermiso("clientes", "w");
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [abonarDeuda, setAbonarDeuda] = useState<Deuda | null>(null);
  const [q, setQ] = useState("");

  const resumenQuery = useQuery({
    queryKey: ["deudas-resumen"],
    queryFn: () => deudasApi.resumenPorCliente(),
    staleTime: 0,
  });

  const resumen = resumenQuery.data?.data.data;
  const clientes = resumen?.clientes ?? [];
  const totalGeneral = resumen?.total_general ?? 0;

  const clientesFiltrados = q.trim()
    ? clientes.filter((c) =>
        `${c.cliente_apellido} ${c.cliente_nombre}`.toLowerCase().includes(q.toLowerCase())
      )
    : clientes;

  return (
    <>
      <NuevaDeudaModal open={nuevaOpen} onClose={() => { setNuevaOpen(false); resumenQuery.refetch(); }} />
      <AbonarDeudaModal deuda={abonarDeuda} open={Boolean(abonarDeuda)} onClose={() => setAbonarDeuda(null)} />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-text">Deudas</h1>
            <p className="mt-1 text-sm text-text-muted">
              Deudas pendientes de clientes. Registrá deudas anteriores o actuales.
            </p>
          </div>
          {canWrite && (
            <Button onClick={() => setNuevaOpen(true)}>
              <Plus size={16} />
              Registrar deuda
            </Button>
          )}
        </div>

        {/* Resumen total */}
        {resumenQuery.isLoading ? (
          <Skeleton className="h-28 w-full rounded-2xl" />
        ) : (
          <div
            className={`relative overflow-hidden rounded-2xl border p-6 ${
              totalGeneral > 0
                ? "border-red-500/30 bg-red-500/6"
                : "border-green-500/30 bg-green-500/6"
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <Wallet size={16} className={totalGeneral > 0 ? "text-red-400" : "text-green-400"} />
              <p className={`text-sm font-semibold ${totalGeneral > 0 ? "text-red-400" : "text-green-400"}`}>
                Total en deudas
              </p>
            </div>
            <p className={`text-5xl font-black tracking-tight ${totalGeneral > 0 ? "text-red-300" : "text-green-300"}`}>
              {formatMoney(totalGeneral)}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} con deuda pendiente
            </p>
          </div>
        )}

        {/* Lista de clientes con deuda */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar cliente..."
              className="flex-1 rounded-xl border border-border bg-surface-3 px-3 py-2 text-sm text-text outline-none transition focus:border-primary"
            />
          </div>

          {resumenQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <EmptyState
              title={q ? "Sin resultados" : "Sin deudas pendientes"}
              description={q ? "Probá con otro nombre." : "Registrá deudas anteriores o actuales de tus clientes."}
              icon={AlertCircle}
            />
          ) : (
            <div className="space-y-2">
              {clientesFiltrados.map((c) => (
                <ClienteDeudaRow
                  key={c.cliente_id}
                  clienteId={c.cliente_id}
                  nombre={c.cliente_nombre}
                  apellido={c.cliente_apellido}
                  cantidadDeudas={Number(c.cantidad_deudas)}
                  totalDeuda={Number(c.total_deuda)}
                  canWrite={canWrite}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
