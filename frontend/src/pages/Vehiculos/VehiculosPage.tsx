import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { vehiculosApi, type Vehiculo } from "../../features/vehiculos/api";
import { useDebounce } from "../../shared/hooks/useDebounce";
import { useConfirm } from "../../shared/hooks/useConfirm";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { EmptyState } from "../../shared/ui/EmptyState";
import { TableSkeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { VehiculoModal } from "./VehiculoModal";

export function VehiculosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { add } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vehiculo | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const { confirm, confirmModalProps } = useConfirm();

  const initialClienteId = useMemo(() => {
    const rawValue = searchParams.get("clienteId");
    return rawValue ? Number(rawValue) : null;
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("nuevo") === "1") {
      setEditing(null);
      setModalOpen(true);
    }
  }, [searchParams]);

  const query = useQuery({
    queryKey: ["vehiculos", page, debouncedSearch],
    queryFn: () =>
      vehiculosApi.listar({
        page,
        limit: 12,
        q: debouncedSearch || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vehiculosApi.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehiculos"] });
      add("Vehículo eliminado.");
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const vehiculos = query.data?.data.data.rows ?? [];
  const total = query.data?.data.data.total ?? 0;

  const closeModal = () => {
    setModalOpen(false);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("nuevo");
    nextParams.delete("clienteId");
    setSearchParams(nextParams, { replace: true });
  };

  const handleEliminar = async (vehiculo: Vehiculo) => {
    const ok = await confirm({
      title: `¿Eliminar el vehículo ${vehiculo.patente}?`,
      description: "El historial se conserva, pero el vehículo dejará de aparecer.",
      confirmLabel: "Sí, eliminar",
      variant: "danger",
    });

    if (ok) {
      deleteMutation.mutate(vehiculo.id);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text">Vehículos</h1>
          <p className="mt-1 text-sm text-text-muted">Registro de autos vinculados a sus propietarios.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={16} /> Nuevo vehículo
        </Button>
      </div>

      <Card>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por patente, marca, modelo o cliente..."
            className="w-full rounded-xl border border-border bg-surface-3 px-10 py-2.5 text-sm text-text outline-none transition focus:border-primary"
          />
        </div>
      </Card>

      <Card padding={false}>
        {query.isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={6} />
          </div>
        ) : vehiculos.length === 0 ? (
          <EmptyState
            title="No hay vehículos para mostrar"
            description={search ? "No se encontraron resultados con ese criterio." : "Crea el primer vehículo para empezar."}
            action={
              search
                ? undefined
                : {
                    label: "Crear vehículo",
                    onClick: () => setModalOpen(true),
                  }
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
                    <th className="px-4 py-3">Patente</th>
                    <th className="px-4 py-3">Vehículo</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vehiculos.map((vehiculo) => (
                    <tr key={vehiculo.id} className="border-b border-border/60 transition hover:bg-surface-2">
                      <td className="px-4 py-3 font-mono font-bold text-accent">{vehiculo.patente}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">
                          {vehiculo.marca} {vehiculo.modelo}
                        </div>
                        <div className="text-xs text-text-muted">{vehiculo.anio || "-"} · {vehiculo.color || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {vehiculo.cliente_apellido}, {vehiculo.cliente_nombre}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="gray">{vehiculo.tipo_combustible}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/vehiculos/${vehiculo.id}`)}>
                            <Eye size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(vehiculo);
                              setModalOpen(true);
                            }}
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEliminar(vehiculo)}
                          >
                            <Trash2 size={15} className="text-red-300" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

      <VehiculoModal
        open={modalOpen}
        onClose={closeModal}
        editing={editing}
        initialClienteId={initialClienteId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["vehiculos"] });
          queryClient.invalidateQueries({ queryKey: ["clientes"] });
        }}
      />

      <ConfirmModal {...confirmModalProps} loading={deleteMutation.isPending} />
    </div>
  );
}
