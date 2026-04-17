import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Tags, Trash2 } from "lucide-react";
import { categoriasApi } from "../../features/categorias/api";
import { serviciosApi, type Servicio } from "../../features/servicios/api";
import { useDebounce } from "../../shared/hooks/useDebounce";
import { useConfirm } from "../../shared/hooks/useConfirm";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { EmptyState } from "../../shared/ui/EmptyState";
import { TableSkeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { AumentoMasivoModal } from "./AumentoMasivoModal";
import { ServicioModal } from "./ServicioModal";

export function ServiciosPage() {
  const queryClient = useQueryClient();
  const { add } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [categoriaId, setCategoriaId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [masivoOpen, setMasivoOpen] = useState(false);
  const [editing, setEditing] = useState<Servicio | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const { confirm, confirmModalProps } = useConfirm();

  const categoriasQuery = useQuery({
    queryKey: ["categorias-servicio"],
    queryFn: () => categoriasApi.listar("servicio"),
    staleTime: 5 * 60_000,
  });

  const serviciosQuery = useQuery({
    queryKey: ["servicios", page, debouncedSearch, categoriaId],
    queryFn: () =>
      serviciosApi.listar({
        page,
        limit: 12,
        q: debouncedSearch || undefined,
        categoria_id: categoriaId || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => serviciosApi.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicios"] });
      add("Servicio eliminado.");
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const categorias = categoriasQuery.data?.data.data ?? [];
  const servicios = serviciosQuery.data?.data.data.rows ?? [];
  const total = serviciosQuery.data?.data.data.total ?? 0;

  const handleEliminar = async (servicio: Servicio) => {
    const ok = await confirm({
      title: `¿Eliminar el servicio ${servicio.nombre}?`,
      description: "No afecta órdenes anteriores.",
      confirmLabel: "Sí, eliminar",
      variant: "danger",
    });

    if (ok) {
      deleteMutation.mutate(servicio.id);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text">Servicios</h1>
          <p className="mt-1 text-sm text-text-muted">
            Catálogo operativo del taller con precios base y tiempos estimados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setMasivoOpen(true)}>
            <Tags size={16} /> Aumento masivo
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={16} /> Nuevo servicio
          </Button>
        </div>
      </div>

      <Card>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nombre o descripción..."
              className="w-full rounded-xl border border-border bg-surface-3 px-10 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            />
          </div>

          <select
            value={categoriaId}
            onChange={(event) => {
              setCategoriaId(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card padding={false}>
        {serviciosQuery.isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={6} />
          </div>
        ) : servicios.length === 0 ? (
          <EmptyState
            title="No hay servicios para mostrar"
            description={
              search || categoriaId
                ? "No encontramos servicios con los filtros elegidos."
                : "Carga los trabajos habituales del taller para reutilizarlos en cada orden."
            }
            action={
              search || categoriaId
                ? undefined
                : {
                    label: "Crear servicio",
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
                    <th className="px-4 py-3">Servicio</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Precio base</th>
                    <th className="px-4 py-3">Tiempo</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {servicios.map((servicio) => (
                    <tr key={servicio.id} className="border-b border-border/60 transition hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">{servicio.nombre}</div>
                        <div className="max-w-xl text-xs text-text-muted">
                          {servicio.descripcion || "Sin descripción adicional."}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="blue">{servicio.categoria_nombre}</Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-text">{formatMoney(servicio.precio_base)}</td>
                      <td className="px-4 py-3 text-text-muted">
                        {servicio.tiempo_estimado_min ? `${servicio.tiempo_estimado_min} min` : "Sin definir"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(servicio);
                              setModalOpen(true);
                            }}
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEliminar(servicio)}
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

      <ServicioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["servicios"] });
        }}
      />

      <AumentoMasivoModal
        open={masivoOpen}
        onClose={() => setMasivoOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["servicios"] });
        }}
      />

      <ConfirmModal {...confirmModalProps} loading={deleteMutation.isPending} />
    </div>
  );
}
