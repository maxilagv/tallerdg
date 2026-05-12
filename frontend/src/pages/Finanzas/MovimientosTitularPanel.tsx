import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { finanzasApi } from "../../features/finanzas/api";
import type { MovimientoTitular } from "../../features/finanzas/api";
import { Button } from "../../shared/ui/Button";
import { useToast } from "../../shared/ui/Toast";
import { useAuthStore } from "../../shared/store/authStore";
import { formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { RegistrarMovimientoModal } from "./RegistrarMovimientoModal";
import { OwnerAuthorizationModal } from "./OwnerAuthorizationModal";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFechaCorta(fechaStr: string) {
  const date = new Date(fechaStr + "T12:00:00");
  return date.toLocaleDateString("es-AR", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  desde?: string;
  hasta?: string;
}

export function MovimientosTitularPanel({ desde, hasta }: Props) {
  const qc      = useQueryClient();
  const { add } = useToast();
  const empleado = useAuthStore((state) => state.empleado);
  const esAdmin  = empleado?.permisos?.["*"] === "rw";

  const [modalOpen,     setModalOpen]     = useState(false);
  const [editando,      setEditando]      = useState<MovimientoTitular | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MovimientoTitular | null>(null);
  const [ownerForDelete, setOwnerForDelete] = useState<MovimientoTitular | null>(null);
  const [limite,        setLimite]        = useState(10);

  // Resetear paginación cuando cambia el período
  useEffect(() => {
    setLimite(10);
  }, [desde, hasta]);

  // ── Query ──────────────────────────────────────────────────────────────────

  const query = useQuery({
    queryKey: ["finanzas-movimientos-titular", desde, hasta, limite],
    queryFn:  () => finanzasApi.movimientosTitular({ desde, hasta, limit: limite }),
    staleTime: 30_000,
  });

  const rows: MovimientoTitular[]  = query.data?.data.data.rows ?? [];
  const total: number              = query.data?.data.data.total ?? 0;

  // ── Totales del período ────────────────────────────────────────────────────

  const totalAportes = rows.filter((r) => r.tipo === "aporte_titular").reduce((s, r) => s + Number(r.monto), 0);
  const totalRetiros = rows.filter((r) => r.tipo === "retiro_titular").reduce((s, r) => s + Number(r.monto), 0);
  const neto         = totalAportes - totalRetiros;

  // ── Mutación de eliminación ────────────────────────────────────────────────

  const eliminar = useMutation({
    mutationFn: (vars: { id: number; ownerToken?: string }) =>
      finanzasApi.eliminarMovimientoTitular(vars.id, vars.ownerToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finanzas-resumen"] });
      qc.invalidateQueries({ queryKey: ["finanzas-movimientos-detalle"] });
      qc.invalidateQueries({ queryKey: ["finanzas-movimientos-titular"] });
      qc.invalidateQueries({ queryKey: ["finanzas-analisis"] });
      qc.invalidateQueries({ queryKey: ["finanzas-movimientos-mes"] });
      add("Movimiento eliminado.", "success");
      setConfirmDelete(null);
      setOwnerForDelete(null);
    },
    onError: (err) => add(getErrorMessage(err), "error"),
  });

  const confirmarEliminacion = () => {
    if (!confirmDelete) return;
    if (esAdmin) {
      eliminar.mutate({ id: confirmDelete.id });
      return;
    }
    setOwnerForDelete(confirmDelete);
    setConfirmDelete(null);
  };

  const handleOwnerAuthorizedDelete = (token: string) => {
    if (!ownerForDelete) return;
    eliminar.mutate({ id: ownerForDelete.id, ownerToken: token });
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleEditar = (mov: MovimientoTitular) => {
    setEditando(mov);
    setModalOpen(true);
  };

  const handleCerrarModal = () => {
    setModalOpen(false);
    setEditando(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Encabezado con botón Registrar */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text">Movimientos del período</p>
          <p className="text-xs text-text-muted">
            Plata que pusiste o sacaste — no cambia lo que generó el taller.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => { setEditando(null); setModalOpen(true); }}
        >
          <Plus size={14} />
          Registrar
        </Button>
      </div>

      {/* Totales rápidos */}
      {rows.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-violet-500/10 p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <ArrowDownToLine size={12} className="text-violet-400" />
              <p className="text-[11px] text-violet-400">Pusiste en caja</p>
            </div>
            <p className="text-lg font-bold text-violet-300">+{formatMoney(totalAportes)}</p>
          </div>
          <div className="rounded-xl bg-purple-500/10 p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <ArrowUpFromLine size={12} className="text-purple-400" />
              <p className="text-[11px] text-purple-400">Sacaste de caja</p>
            </div>
            <p className="text-lg font-bold text-purple-300">-{formatMoney(totalRetiros)}</p>
          </div>
          <div className={`rounded-xl p-3 ${neto >= 0 ? "bg-violet-500/8" : "bg-red-500/8"}`}>
            <p className={`mb-1 text-[11px] ${neto >= 0 ? "text-violet-400" : "text-red-400"}`}>
              Neto tus movimientos
            </p>
            <p className={`text-lg font-bold ${neto >= 0 ? "text-violet-300" : "text-red-300"}`}>
              {neto >= 0 ? "+" : ""}{formatMoney(neto)}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {query.isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border p-3">
              <div className="h-4 w-40 rounded bg-surface-3" />
              <div className="mt-2 h-3 w-56 rounded bg-surface-3" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {query.isError && !query.isLoading && (
        <p className="py-4 text-center text-sm text-text-muted">
          No se pudo cargar. Verificá la conexión e intentá de nuevo.
        </p>
      )}

      {/* Sin movimientos */}
      {!query.isLoading && !query.isError && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm font-medium text-text">Sin movimientos en este período</p>
          <p className="mt-1 text-xs text-text-muted">
            Registrá un aporte o retiro usando el botón de arriba.
          </p>
        </div>
      )}

      {/* Lista */}
      {!query.isLoading && !query.isError && rows.length > 0 && (
        <>
          <div className="space-y-2">
            {rows.map((mov) => {
              const esAporte = mov.tipo === "aporte_titular";
              return (
                <div
                  key={mov.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-3 transition hover:bg-surface-2/70"
                >
                  {/* Ícono */}
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${esAporte ? "bg-violet-500/15" : "bg-purple-500/15"}`}>
                    {esAporte
                      ? <ArrowDownToLine size={13} className="text-violet-400" />
                      : <ArrowUpFromLine size={13} className="text-purple-400" />
                    }
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{mov.concepto}</p>
                    <p className="text-xs text-text-muted">
                      {formatFechaCorta(mov.fecha)}
                      {mov.referencia && <span className="ml-1 opacity-60">· {mov.referencia}</span>}
                      {mov.empleado_nombre && <span className="ml-1 opacity-60">· {mov.empleado_nombre}</span>}
                    </p>
                    {mov.notas && (
                      <p className="mt-0.5 truncate text-xs italic text-text-muted/70">{mov.notas}</p>
                    )}
                  </div>

                  {/* Monto + acciones */}
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`text-sm font-bold ${esAporte ? "text-violet-300" : "text-purple-300"}`}>
                      {esAporte ? "+" : "-"}{formatMoney(Number(mov.monto))}
                    </span>
                    <button
                      onClick={() => handleEditar(mov)}
                      className="rounded-lg p-1.5 text-text-muted transition hover:bg-surface-3 hover:text-text"
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(mov)}
                      className="rounded-lg p-1.5 text-text-muted transition hover:bg-red-500/10 hover:text-red-400"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ver más */}
          {total > rows.length && (
            <div className="mt-3 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLimite((l) => l + 10)}
                loading={query.isFetching}
              >
                Ver {Math.min(10, total - rows.length)} más
              </Button>
            </div>
          )}

          {/* Indicador de total cuando todo está visible */}
          {total > 0 && total <= rows.length && total > 10 && (
            <p className="mt-2 text-center text-xs text-text-muted">
              {total} movimiento{total !== 1 ? "s" : ""} en el período
            </p>
          )}
        </>
      )}

      {/* ── Modal de registro / edición ────────────────────────────────────── */}
      <RegistrarMovimientoModal
        open={modalOpen}
        onClose={handleCerrarModal}
        movimiento={editando}
      />

      {/* ── Autorizacion del dueño para eliminar ───────────────────────────── */}
      <OwnerAuthorizationModal
        open={!!ownerForDelete}
        scope="cash_manual_movements"
        description="Para eliminar un movimiento manual de caja necesitamos el visto bueno del dueño o un administrador."
        onClose={() => setOwnerForDelete(null)}
        onAuthorized={handleOwnerAuthorizedDelete}
      />

      {/* ── Confirm de eliminación (inline overlay) ────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-1 p-6 shadow-2xl">
            <h3 className="mb-1 text-base font-semibold text-text">¿Eliminar movimiento?</h3>
            <p className="mb-1 text-sm text-text-muted">
              <strong className="text-text">{confirmDelete.concepto}</strong>
            </p>
            <p className="mb-5 text-sm text-text-muted">
              {confirmDelete.tipo === "aporte_titular" ? "Aporte" : "Retiro"} de{" "}
              <strong className="text-text">{formatMoney(Number(confirmDelete.monto))}</strong>.{" "}
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(null)}
                disabled={eliminar.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={eliminar.isPending}
                onClick={confirmarEliminacion}
              >
                {esAdmin ? "Eliminar" : "Pedir autorizacion"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
