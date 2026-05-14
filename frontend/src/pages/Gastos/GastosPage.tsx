import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Receipt, Settings2, Trash2 } from "lucide-react";
import { gastosApi, type Gasto } from "../../features/gastos/api";
import { metodoPagoLabels } from "../../features/pagos/api";
import { CategoriasGastoPanel } from "./CategoriasGastoPanel";
import { useConfirm } from "../../shared/hooks/useConfirm";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { EmptyState } from "../../shared/ui/EmptyState";
import { TableSkeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { formatDate, formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { GastoModal } from "./GastoModal";

export function GastosPage() {
  const queryClient = useQueryClient();
  const { add } = useToast();
  const [page, setPage] = useState(1);
  const [desde, setDesde] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));
  const [categoriaId, setCategoriaId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Gasto | null>(null);
  const [showCategorias, setShowCategorias] = useState(false);
  const { confirm, confirmModalProps } = useConfirm();

  const categoriasQuery = useQuery({
    queryKey: ["gastos-categorias"],
    queryFn: () => gastosApi.listarCategorias(),
    staleTime: 5 * 60_000,
  });

  const gastosQuery = useQuery({
    queryKey: ["gastos", page, desde, hasta, categoriaId],
    queryFn: () =>
      gastosApi.listar({
        page,
        limit: 15,
        desde,
        hasta,
        categoria_id: categoriaId || undefined,
      }),
  });

  const invalidarFinanzas = () => {
    queryClient.invalidateQueries({ queryKey: ["finanzas-resumen"] });
    queryClient.invalidateQueries({ queryKey: ["finanzas-por-dia"] });
    queryClient.invalidateQueries({ queryKey: ["finanzas-categorias"] });
    queryClient.invalidateQueries({ queryKey: ["finanzas-analisis"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => gastosApi.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gastos"] });
      invalidarFinanzas();
      add("Gasto eliminado.");
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const categorias = categoriasQuery.data?.data.data ?? [];
  const gastos = gastosQuery.data?.data.data.rows ?? [];
  const total = gastosQuery.data?.data.data.total ?? 0;

  const handleEliminar = async (gasto: Gasto) => {
    const ok = await confirm({
      title: "¿Eliminar este gasto?",
      description: "Esta acción no se puede deshacer.",
      confirmLabel: "Sí, eliminar",
      variant: "danger",
    });

    if (ok) {
      deleteMutation.mutate(gasto.id);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text">Gastos</h1>
          <p className="mt-1 text-sm text-text-muted">
            Registrá los gastos del taller: sueldos, alquiler, herramientas y más.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowCategorias((v) => !v)}
          >
            <Settings2 size={15} />
            {showCategorias ? "Cerrar categorías" : "Gestionar categorías"}
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={16} /> Nuevo gasto
          </Button>
        </div>
      </div>

      {/* Panel de categorías — se muestra/oculta con el botón */}
      {showCategorias && (
        <Card>
          <h2 className="mb-4 font-semibold text-text flex items-center gap-2">
            <Settings2 size={16} className="text-primary" />
            Categorías de gastos
          </h2>
          <CategoriasGastoPanel categorias={categorias} />
        </Card>
      )}

      <Card>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_260px]">
          <input
            type="date"
            value={desde}
            onChange={(event) => {
              setDesde(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
          />
          <input
            type="date"
            value={hasta}
            onChange={(event) => {
              setHasta(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
          />
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
        {gastosQuery.isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={6} />
          </div>
        ) : gastos.length === 0 ? (
          <EmptyState
            title="No hay gastos para mostrar"
            description="Todavía no hay egresos registrados en el rango seleccionado."
            icon={Receipt}
          />
        ) : (
          <>
            {/* Vista mobile: tarjetas */}
            <div className="divide-y divide-border/60 md:hidden">
              {gastos.map((gasto) => (
                <div key={gasto.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-text">{gasto.descripcion}</div>
                      <div className="mt-0.5 text-xs text-text-muted">
                        {gasto.categoria_nombre} · {formatDate(gasto.fecha)}
                      </div>
                      {gasto.metodo_pago && (
                        <div className="mt-0.5 text-xs text-text-muted">{metodoPagoLabels[gasto.metodo_pago]}</div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-semibold text-red-300">{formatMoney(gasto.monto)}</span>
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(gasto); setModalOpen(true); }}>
                        <Edit size={15} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEliminar(gasto)}>
                        <Trash2 size={15} className="text-red-300" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Vista desktop: tabla completa */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3">Metodo</th>
                    <th className="px-4 py-3">Monto</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map((gasto) => (
                    <tr key={gasto.id} className="border-b border-border/60 transition hover:bg-surface-2">
                      <td className="px-4 py-3 text-text-muted">{formatDate(gasto.fecha)}</td>
                      <td className="px-4 py-3">{gasto.categoria_nombre}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">{gasto.descripcion}</div>
                        {gasto.referencia_empleado_nombre ? (
                          <div className="text-xs text-text-muted">{gasto.referencia_empleado_nombre}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {gasto.metodo_pago ? metodoPagoLabels[gasto.metodo_pago] : "Sin metodo"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-red-300">{formatMoney(gasto.monto)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(gasto);
                              setModalOpen(true);
                            }}
                          >
                            <Edit size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEliminar(gasto)}
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

            {total > 15 ? (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
                <span className="text-text-muted">
                  Mostrando {(page - 1) * 15 + 1} - {Math.min(page * 15, total)} de {total}
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page * 15 >= total}
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

      <GastoModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["gastos"] });
          invalidarFinanzas();
        }}
      />

      <ConfirmModal {...confirmModalProps} loading={deleteMutation.isPending} />
    </div>
  );
}
