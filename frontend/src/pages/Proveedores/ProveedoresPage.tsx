import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { proveedoresApi, type Proveedor } from "../../features/proveedores/api";
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
import { ProveedorModal } from "./ProveedorModal";

export function ProveedoresPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { add } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const { confirm, confirmModalProps } = useConfirm();

  const query = useQuery({
    queryKey: ["proveedores", page, debouncedSearch],
    queryFn: () =>
      proveedoresApi.listar({ page, limit: 15, q: debouncedSearch || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => proveedoresApi.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
      queryClient.invalidateQueries({ queryKey: ["proveedores-select"] });
      add("Proveedor eliminado.");
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const proveedores = query.data?.data.data.rows ?? [];
  const total = query.data?.data.data.total ?? 0;

  const handleEliminar = async (e: React.MouseEvent, p: Proveedor) => {
    e.stopPropagation();
    const ok = await confirm({
      title: `¿Eliminar a ${p.nombre}?`,
      description:
        "Los productos asociados a este proveedor quedarán sin proveedor asignado.",
      confirmLabel: "Sí, eliminar",
      variant: "danger",
    });
    if (ok) deleteMutation.mutate(p.id);
  };

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (e: React.MouseEvent, p: Proveedor) => {
    e.stopPropagation();
    setEditing(p);
    setModalOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text">Proveedores</h1>
          <p className="mt-1 text-sm text-text-muted">
            Empresas y personas de las que comprás productos e insumos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate("/compras")}>
            Ver compras
          </Button>
          <Button onClick={openNew}>
            <Plus size={16} /> Nuevo proveedor
          </Button>
        </div>
      </div>

      <Card>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre, CUIT o teléfono..."
            className="w-full rounded-xl border border-border bg-surface-3 px-10 py-2.5 text-sm text-text outline-none transition focus:border-primary"
          />
        </div>
      </Card>

      <Card padding={false}>
        {query.isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={5} />
          </div>
        ) : proveedores.length === 0 ? (
          <EmptyState
            title="No hay proveedores registrados"
            description={
              search
                ? "No se encontraron resultados."
                : "Creá el primer proveedor para empezar."
            }
            action={
              search ? undefined : { label: "Crear proveedor", onClick: openNew }
            }
            icon={Truck}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3">Condición de pago</th>
                    <th className="px-4 py-3">Cuenta corriente</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {proveedores.map((p) => (
                    <tr
                      key={p.id}
                      className="cursor-pointer border-b border-border/60 transition hover:bg-surface-2"
                      onClick={() => navigate(`/proveedores/${p.id}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-text">{p.nombre}</p>
                        {p.cuit && (
                          <p className="text-xs text-text-muted">
                            CUIT: {p.cuit}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        <div className="space-y-0.5">
                          {p.telefono && (
                            <div className="text-sm">{p.telefono}</div>
                          )}
                          {p.email && (
                            <div className="text-xs">{p.email}</div>
                          )}
                          {!p.telefono && !p.email && (
                            <span className="text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-muted text-sm">
                        {p.condicion_pago || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {p.tiene_cc ? (
                          <div className="space-y-0.5">
                            <Badge
                              variant={
                                Number(p.saldo_cc) > 0
                                  ? "red"
                                  : Number(p.saldo_cc) < 0
                                    ? "yellow"
                                    : "green"
                              }
                            >
                              {Number(p.saldo_cc) > 0
                                ? `Debe ${formatMoney(p.saldo_cc ?? 0)}`
                                : Number(p.saldo_cc) < 0
                                  ? `A favor ${formatMoney(Math.abs(Number(p.saldo_cc ?? 0)))}`
                                  : "Al dia"}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => openEdit(e, p)}
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleEliminar(e, p)}
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

            {total > 15 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
                <span className="text-text-muted">
                  Mostrando {(page - 1) * 15 + 1}–{Math.min(page * 15, total)}{" "}
                  de {total}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((v) => v - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page * 15 >= total}
                    onClick={() => setPage((v) => v + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <ProveedorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["proveedores"] });
          queryClient.invalidateQueries({ queryKey: ["proveedores-select"] });
        }}
      />

      <ConfirmModal {...confirmModalProps} loading={deleteMutation.isPending} />
    </div>
  );
}
