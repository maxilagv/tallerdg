import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Pencil,
  Plus,
  ToggleLeft,
  ToggleRight,
  Wallet,
} from "lucide-react";
import {
  proveedoresApi,
  tipoMovimientoMeta,
  type Proveedor,
} from "../../features/proveedores/api";
import { comprasApi } from "../../features/compras/api";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { TableSkeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { formatDate, formatDateTime, formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { ActivarCCModal } from "./ActivarCCModal";
import { PagoProveedorModal } from "./PagoProveedorModal";
import { ProveedorModal } from "./ProveedorModal";

export function ProveedorDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { add } = useToast();
  const proveedorId = Number(id);

  // Modals
  const [editOpen, setEditOpen] = useState(false);
  const [activarOpen, setActivarOpen] = useState(false);
  const [pagoOpen, setPagoOpen] = useState(false);

  // Paginación movimientos
  const [movPage, setMovPage] = useState(1);
  // Paginación compras
  const [comprasPage, setComprasPage] = useState(1);

  // ── Queries ────────────────────────────────────────────────────────────────

  const ccQuery = useQuery({
    queryKey: ["proveedor-cc", proveedorId],
    queryFn: () => proveedoresApi.getCuentaCorriente(proveedorId),
    enabled: !!proveedorId,
  });

  const movQuery = useQuery({
    queryKey: ["proveedor-movimientos", proveedorId, movPage],
    queryFn: () =>
      proveedoresApi.getMovimientos(proveedorId, { page: movPage, limit: 15 }),
    enabled: !!proveedorId,
  });

  const comprasQuery = useQuery({
    queryKey: ["compras-proveedor", proveedorId, comprasPage],
    queryFn: () =>
      comprasApi.listar({ proveedor_id: proveedorId, page: comprasPage, limit: 10 }),
    enabled: !!proveedorId,
  });

  // ── Toggle CC ──────────────────────────────────────────────────────────────

  const toggleMutation = useMutation({
    mutationFn: () =>
      proveedoresApi.activarCuentaCorriente(proveedorId, {}),
    onSuccess: (res) => {
      const cc = res.data.data;
      add(cc.activa ? "Cuenta corriente reactivada." : "Cuenta corriente pausada.");
      queryClient.invalidateQueries({ queryKey: ["proveedor-cc", proveedorId] });
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  // ── Datos ──────────────────────────────────────────────────────────────────

  const ccData = ccQuery.data?.data.data;
  const proveedor = ccData?.proveedor;
  const cc = ccData?.cuenta_corriente;

  const movimientos = movQuery.data?.data.data.rows ?? [];
  const movTotal = movQuery.data?.data.data.total ?? 0;

  const compras = comprasQuery.data?.data.data.rows ?? [];
  const comprasTotal = comprasQuery.data?.data.data.total ?? 0;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["proveedor-cc", proveedorId] });
    queryClient.invalidateQueries({ queryKey: ["proveedor-movimientos", proveedorId] });
    queryClient.invalidateQueries({ queryKey: ["proveedores"] });
  };

  if (ccQuery.isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-3" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface-3" />
      </div>
    );
  }

  if (!proveedor || ccQuery.isError) {
    return (
      <EmptyState
        title="Proveedor no encontrado"
        description="No se pudo cargar la información del proveedor."
        action={{ label: "Volver a proveedores", onClick: () => navigate("/proveedores") }}
        icon={Building2}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/proveedores")}
            className="text-text-muted transition hover:text-text"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">{proveedor.nombre}</h1>
            <p className="mt-0.5 text-sm text-text-muted">
              {proveedor.cuit && <span className="mr-3">CUIT: {proveedor.cuit}</span>}
              {proveedor.telefono && <span className="mr-3">{proveedor.telefono}</span>}
              {proveedor.email && <span>{proveedor.email}</span>}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil size={15} /> Editar proveedor
        </Button>
      </div>

      {/* Info + CC Status */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Info básica */}
        <Card className="md:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-text">Información</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-text-muted">Condición de pago</dt>
              <dd className="mt-0.5 font-medium text-text">
                {proveedor.condicion_pago || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Email</dt>
              <dd className="mt-0.5 font-medium text-text">
                {proveedor.email || "—"}
              </dd>
            </div>
            {proveedor.notas && (
              <div className="col-span-2">
                <dt className="text-text-muted">Notas</dt>
                <dd className="mt-0.5 text-text">{proveedor.notas}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Saldo CC */}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Cuenta corriente</h2>
            {cc ? (
              <button
                onClick={() => toggleMutation.mutate()}
                disabled={toggleMutation.isPending}
                className="text-text-muted transition hover:text-text"
                title={cc.activa ? "Pausar cuenta" : "Reactivar cuenta"}
              >
                {cc.activa ? <ToggleRight size={20} className="text-green-400" /> : <ToggleLeft size={20} />}
              </button>
            ) : null}
          </div>

          {!cc ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-text-muted">
                No tiene cuenta corriente activada.
              </p>
              <Button
                size="sm"
                onClick={() => setActivarOpen(true)}
                className="w-full justify-center"
              >
                <CreditCard size={15} /> Activar cuenta corriente
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs text-text-muted">
                  {cc.activa
                    ? Number(cc.saldo) < 0
                      ? "Saldo a favor"
                      : "Deuda actual"
                    : "Cuenta pausada - ultimo saldo"}
                </p>
                <p
                  className={`text-3xl font-bold ${
                    Number(cc.saldo) > 0
                      ? "text-red-400"
                      : Number(cc.saldo) < 0
                      ? "text-yellow-400"
                      : "text-green-400"
                  }`}
                >
                  {formatMoney(Number(cc.saldo) < 0 ? Math.abs(Number(cc.saldo)) : cc.saldo)}
                </p>
                {Number(cc.saldo) === 0 && (
                  <p className="text-xs text-green-400">Sin deuda pendiente</p>
                )}
              </div>
              {cc.activa && (
                <Button
                  size="sm"
                  onClick={() => setPagoOpen(true)}
                  className="w-full justify-center"
                  disabled={Number(cc.saldo) <= 0}
                >
                  <Wallet size={15} /> Registrar pago
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Movimientos de CC */}
      {cc && (
        <Card padding={false}>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-text">
              Historial de cuenta corriente
            </h2>
          </div>

          {movQuery.isLoading ? (
            <div className="p-5">
              <TableSkeleton rows={4} />
            </div>
          ) : movimientos.length === 0 ? (
            <EmptyState
              title="Sin movimientos"
              description="Aún no hay movimientos en la cuenta corriente."
              icon={CreditCard}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3">Registrado por</th>
                      <th className="px-4 py-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((m) => {
                      const meta = tipoMovimientoMeta[m.tipo];
                      return (
                        <tr
                          key={m.id}
                          className="border-b border-border/60 transition hover:bg-surface-2"
                        >
                          <td className="px-4 py-3 text-text-muted">
                            {formatDateTime(m.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-text">
                            {m.descripcion}
                            {m.compra_fecha && (
                              <p className="text-xs text-text-muted">
                                Compra del {formatDate(m.compra_fecha)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-text-muted text-xs">
                            {m.empleado_nombre?.trim() || "—"}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-semibold ${
                              m.tipo === "deuda"
                                ? "text-red-400"
                                : m.tipo === "pago"
                                ? "text-green-400"
                                : "text-blue-400"
                            }`}
                          >
                            {m.tipo === "deuda" ? "+" : m.tipo === "pago" ? "-" : ""}
                            {formatMoney(m.monto)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {movTotal > 15 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
                  <span className="text-text-muted">
                    {(movPage - 1) * 15 + 1}–{Math.min(movPage * 15, movTotal)} de{" "}
                    {movTotal}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={movPage === 1}
                      onClick={() => setMovPage((v) => v - 1)}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={movPage * 15 >= movTotal}
                      onClick={() => setMovPage((v) => v + 1)}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* Compras de este proveedor */}
      <Card padding={false}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-text">
            Compras registradas a este proveedor
          </h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate(`/compras?proveedor_id=${proveedorId}`)}
          >
            <Plus size={14} /> Nueva compra
          </Button>
        </div>

        {comprasQuery.isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={3} />
          </div>
        ) : compras.length === 0 ? (
          <EmptyState
            title="Sin compras registradas"
            description="Aún no hay compras cargadas para este proveedor."
            icon={Building2}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Registrada por</th>
                    <th className="px-4 py-3">Notas</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {compras.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border/60 transition hover:bg-surface-2"
                    >
                      <td className="px-4 py-3 text-text">
                        {formatDate(c.fecha)}
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs">
                        {c.empleado_nombre?.trim() || "—"}
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs">
                        {c.notas || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-text">
                        {formatMoney(c.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {comprasTotal > 10 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
                <span className="text-text-muted">
                  {(comprasPage - 1) * 10 + 1}–
                  {Math.min(comprasPage * 10, comprasTotal)} de {comprasTotal}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={comprasPage === 1}
                    onClick={() => setComprasPage((v) => v - 1)}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={comprasPage * 10 >= comprasTotal}
                    onClick={() => setComprasPage((v) => v + 1)}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Modales */}
      {editOpen && (
        <ProveedorModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          editing={proveedor as Proveedor}
          onSuccess={invalidateAll}
        />
      )}

      {activarOpen && (
        <ActivarCCModal
          open={activarOpen}
          onClose={() => setActivarOpen(false)}
          proveedor={proveedor as Proveedor}
          onSuccess={invalidateAll}
        />
      )}

      {pagoOpen && cc && (
        <PagoProveedorModal
          open={pagoOpen}
          onClose={() => setPagoOpen(false)}
          proveedor={proveedor as Proveedor}
          cc={cc}
          onSuccess={invalidateAll}
        />
      )}
    </div>
  );
}
