import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clientesApi, type Cliente } from "../../features/clientes/api";
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
import { ClienteModal } from "./ClienteModal";

export function ClientesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { add } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const { confirm, confirmModalProps } = useConfirm();

  const query = useQuery({
    queryKey: ["clientes", page, debouncedSearch],
    queryFn: () =>
      clientesApi.listar({
        page,
        limit: 12,
        q: debouncedSearch || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => clientesApi.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      add("Cliente eliminado.");
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const clientes = query.data?.data.data.rows ?? [];
  const total = query.data?.data.data.total ?? 0;

  const handleEliminar = async (cliente: Cliente) => {
    const ok = await confirm({
      title: `¿Eliminar a ${cliente.nombre} ${cliente.apellido}?`,
      description: "Sus vehículos e historial se conservan, pero dejará de aparecer en listados.",
      confirmLabel: "Sí, eliminar",
      variant: "danger",
    });

    if (ok) {
      deleteMutation.mutate(cliente.id);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text">Clientes</h1>
          <p className="mt-1 text-sm text-text-muted">Gestión de clientes y acceso a sus autos.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={16} /> Nuevo cliente
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
            placeholder="Buscar por nombre, apellido o teléfono..."
            className="w-full rounded-xl border border-border bg-surface-3 px-10 py-2.5 text-sm text-text outline-none transition focus:border-primary"
          />
        </div>
      </Card>

      <Card padding={false}>
        {query.isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={6} />
          </div>
        ) : clientes.length === 0 ? (
          <EmptyState
            title="No hay clientes para mostrar"
            description={search ? "No se encontraron resultados con ese criterio." : "Crea el primer cliente para empezar."}
            action={
              search
                ? undefined
                : {
                    label: "Crear cliente",
                    onClick: () => setModalOpen(true),
                  }
            }
          />
        ) : (
          <>
            {/* Vista mobile: tarjetas */}
            <div className="divide-y divide-border/60 md:hidden">
              {clientes.map((cliente) => (
                <div key={cliente.id} className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => navigate(`/clientes/${cliente.id}`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="font-medium text-text">{cliente.apellido}, {cliente.nombre}</div>
                    <div className="mt-0.5 text-xs text-text-muted">{cliente.telefono || "Sin teléfono"}</div>
                    <div className="mt-1.5">
                      <Badge variant="blue">{cliente.total_vehiculos ?? 0} autos</Badge>
                    </div>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(cliente); setModalOpen(true); }}>
                      <Pencil size={15} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEliminar(cliente)}>
                      <Trash2 size={15} className="text-red-300" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Vista desktop: tabla completa */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3">Vehículos</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cliente) => (
                    <tr key={cliente.id} className="border-b border-border/60 transition hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/clientes/${cliente.id}`)}
                          className="font-medium text-text transition hover:text-primary"
                        >
                          {cliente.apellido}, {cliente.nombre}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        <div className="space-y-1">
                          <div>{cliente.telefono || "-"}</div>
                          <div>{cliente.email || "-"}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="blue">{cliente.total_vehiculos ?? 0} autos</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/clientes/${cliente.id}`)}>
                            <Eye size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(cliente);
                              setModalOpen(true);
                            }}
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEliminar(cliente)}
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

      <ClienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["clientes"] })}
      />

      <ConfirmModal {...confirmModalProps} loading={deleteMutation.isPending} />
    </div>
  );
}
