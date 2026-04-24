import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Package, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { comprasApi, type Compra } from "../../features/compras/api";
import { useConfirm } from "../../shared/hooks/useConfirm";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { EmptyState } from "../../shared/ui/EmptyState";
import { TableSkeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { formatDate, formatMoney } from "../../shared/utils/format";
import { CompraModal } from "./CompraModal";

export function ComprasPage() {
  const queryClient = useQueryClient();
  const { add } = useToast();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { confirm, confirmModalProps } = useConfirm();

  const query = useQuery({
    queryKey: ["compras", page],
    queryFn: () => comprasApi.listar({ page, limit: 15 }),
  });

  const detailQuery = useQuery({
    queryKey: ["compra-detalle", expandedId],
    queryFn: () => comprasApi.obtener(expandedId!),
    enabled: expandedId !== null,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => comprasApi.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-stock-bajo"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stock-bajo"] });
      add("Compra eliminada.");
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const compras = query.data?.data.data.rows ?? [];
  const total = query.data?.data.data.total ?? 0;
  const detalle = detailQuery.data?.data.data;

  const handleEliminar = async (c: Compra) => {
    const ok = await confirm({
      title: "¿Eliminar esta compra?",
      description: c.actualiza_stock
        ? "El stock de los productos incluidos sera restaurado automaticamente."
        : "Se eliminara el registro de compra sin tocar stock.",
      confirmLabel: "Sí, eliminar",
      variant: "warning",
    });
    if (ok) deleteMutation.mutate(c.id);
  };

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text">Compras</h1>
          <p className="mt-1 text-sm text-text-muted">
            Registra compras de proveedor, casas de repuestos o compras libres con stock opcional.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Registrar compra
        </Button>
      </div>

      <Card padding={false}>
        {query.isLoading ? (
          <div className="p-5"><TableSkeleton rows={5} /></div>
        ) : compras.length === 0 ? (
          <EmptyState
            title="No hay compras registradas"
            description="Cuando registres una compra, el stock de los productos se actualiza solo."
            action={{ label: "Registrar primera compra", onClick: () => setModalOpen(true) }}
            icon={ShoppingCart}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Origen</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Notas</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {compras.map((c) => (
                    <>
                      <tr
                        key={c.id}
                        className="border-b border-border/60 transition hover:bg-surface-2 cursor-pointer"
                        onClick={() => toggleExpand(c.id)}
                      >
                        <td className="px-4 py-3 text-text-muted">{formatDate(c.fecha)}</td>
                        <td className="px-4 py-3 font-medium text-text">
                          {c.proveedor_nombre ||
                            c.origen_nombre ||
                            <span className="text-text-muted text-xs">Compra directa</span>}
                          {!c.actualiza_stock ? (
                            <span className="ml-2 rounded-lg bg-surface-3 px-2 py-0.5 text-xs text-text-muted">
                              sin stock
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-semibold text-green-300">{formatMoney(c.total)}</td>
                        <td className="px-4 py-3 text-text-muted text-xs max-w-48 truncate">
                          {c.notas || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end items-center gap-1">
                            <button className="text-text-muted hover:text-text p-1">
                              {expandedId === c.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleEliminar(c); }}
                            >
                              <Trash2 size={15} className="text-red-300" />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Detalle expandible */}
                      {expandedId === c.id && (
                        <tr key={`detail-${c.id}`} className="border-b border-border/40 bg-surface-2">
                          <td colSpan={5} className="px-6 py-3">
                            {detailQuery.isLoading ? (
                              <p className="text-xs text-text-muted">Cargando detalle...</p>
                            ) : detalle?.items?.length ? (
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-text-muted uppercase mb-2">
                                  Items incluidos
                                </p>
                                {detalle.items.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-text">
                                      <Package size={13} className="text-text-muted" />
                                      <span>{item.producto_nombre || item.descripcion || "Item libre"}</span>
                                      {item.codigo && (
                                        <span className="text-xs text-text-muted">({item.codigo})</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 text-text-muted text-xs">
                                      <span>{Number(item.cantidad).toLocaleString("es-AR")} {item.unidad || "unidad"}</span>
                                      <span>×</span>
                                      <span>{formatMoney(item.precio_unitario)}</span>
                                      <span className="font-semibold text-text">{formatMoney(item.subtotal)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-text-muted">Sin detalle disponible.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {total > 15 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
                <span className="text-text-muted">
                  Mostrando {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} de {total}
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page === 1}
                    onClick={() => setPage((v) => v - 1)}>Anterior</Button>
                  <Button variant="secondary" size="sm" disabled={page * 15 >= total}
                    onClick={() => setPage((v) => v + 1)}>Siguiente</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <CompraModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["compras"] });
          queryClient.invalidateQueries({ queryKey: ["productos"] });
          queryClient.invalidateQueries({ queryKey: ["sidebar-stock-bajo"] });
        }}
      />

      <ConfirmModal {...confirmModalProps} loading={deleteMutation.isPending} />
    </div>
  );
}
