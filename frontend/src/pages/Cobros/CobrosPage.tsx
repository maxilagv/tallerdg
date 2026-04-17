import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Download, Receipt, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { empleadosApi } from "../../features/empleados/api";
import {
  estadoCobroMeta,
  metodoPagoLabels,
  metodoPagoOptions,
  pagosApi,
  type MetodoPago,
  type Pago,
} from "../../features/pagos/api";
import { useAuthStore } from "../../shared/store/authStore";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { TableSkeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { formatDate, formatDateTime, formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { AnularPagoModal } from "./AnularPagoModal";

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonthISO() {
  const now = new Date();
  return formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function todayISO() {
  return formatLocalDate(new Date());
}

export function CobrosPage() {
  const queryClient = useQueryClient();
  const { add } = useToast();
  const hasPermiso = useAuthStore((state) => state.hasPermiso);
  const canEditCobros = hasPermiso("cobros", "w");
  const canViewEmpleados = hasPermiso("empleados");
  const [desde, setDesde] = useState(startOfMonthISO());
  const [hasta, setHasta] = useState(todayISO());
  const [metodo, setMetodo] = useState("");
  const [empleadoId, setEmpleadoId] = useState("");
  const [includeAnulados, setIncludeAnulados] = useState(false);
  const [page, setPage] = useState(1);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Pago | null>(null);

  const filtros = useMemo(
    () => ({
      desde,
      hasta,
      metodo: (metodo || undefined) as MetodoPago | undefined,
      empleado_id: empleadoId ? Number(empleadoId) : undefined,
      include_anulados: includeAnulados,
      page,
      limit: 20,
    }),
    [desde, hasta, metodo, empleadoId, includeAnulados, page]
  );

  const cobrosQuery = useQuery({
    queryKey: ["cobros", filtros],
    queryFn: () => pagosApi.listar(filtros),
  });

  const empleadosQuery = useQuery({
    queryKey: ["empleados-cobros-filtro"],
    queryFn: () => empleadosApi.listar({ page: 1, limit: 200 }),
    enabled: canViewEmpleados,
    staleTime: 60_000,
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      pagosApi.exportarExcel({
        ...filtros,
        page: 1,
        limit: 5000,
      }),
    onSuccess: ({ data, headers }) => {
      const url = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      const contentDisposition = String(headers["content-disposition"] || "");
      const match = contentDisposition.match(/filename="?([^"]+)"?/i);
      anchor.href = url;
      anchor.download = match?.[1] || `cobros-${desde}-${hasta}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const cobros = cobrosQuery.data?.data.data.rows ?? [];
  const resumen = cobrosQuery.data?.data.data.resumen;
  const total = cobrosQuery.data?.data.data.total ?? 0;
  const empleados = empleadosQuery.data?.data.data.rows ?? [];

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cobros"] }),
      queryClient.invalidateQueries({ queryKey: ["ordenes"] }),
      queryClient.invalidateQueries({ queryKey: ["finanzas-resumen"] }),
      queryClient.invalidateQueries({ queryKey: ["finanzas-por-dia"] }),
      queryClient.invalidateQueries({ queryKey: ["finanzas-categorias"] }),
      queryClient.invalidateQueries({ queryKey: ["finanzas-movimientos"] }),
      queryClient.invalidateQueries({ queryKey: ["cliente-deuda"] }),
    ]);
  };

  const isLoading = cobrosQuery.isLoading;
  const isError = cobrosQuery.isError;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Cobros</h1>
          <p className="mt-1 text-sm text-text-muted">
            Registro real de dinero ingresado por orden, con trazabilidad completa y anulaciones auditadas.
          </p>
        </div>
        <Button onClick={() => exportMutation.mutate()} loading={exportMutation.isPending}>
          <Download size={16} /> Exportar Excel
        </Button>
      </div>

      <Card>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(event) => {
                setDesde(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(event) => {
                setHasta(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Metodo</label>
            <select
              value={metodo}
              onChange={(event) => {
                setMetodo(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            >
              <option value="">Todos</option>
              {metodoPagoOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {canViewEmpleados ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">Empleado</label>
              <select
                value={empleadoId}
                onChange={(event) => {
                  setEmpleadoId(event.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              >
                <option value="">Todos</option>
                {empleados.map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>
                    {empleado.nombre} {empleado.apellido}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <label className="flex items-end gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-text">
            <input
              type="checkbox"
              checked={includeAnulados}
              onChange={(event) => {
                setIncludeAnulados(event.target.checked);
                setPage(1);
              }}
              className="mt-0.5"
            />
            Incluir anulados
          </label>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumenCard label="Total cobrado" value={formatMoney(resumen?.total_cobrado || 0)} tone="green" />
        <ResumenCard label="Cobros activos" value={String(resumen?.cantidad_cobros || 0)} tone="blue" />
        <ResumenCard label="Ordenes cobradas" value={String(resumen?.cantidad_ordenes || 0)} tone="gray" />
        <ResumenCard label="Periodo" value={`${formatDate(desde)} - ${formatDate(hasta)}`} tone="gray" compact />
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <Receipt size={16} className="text-text-muted" />
          <h2 className="text-base font-semibold text-text">Totales por metodo</h2>
        </div>
        {resumen?.totales_por_metodo?.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {resumen.totales_por_metodo.map((item) => (
              <div key={item.metodo} className="rounded-xl border border-border bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-wide text-text-muted">{metodoPagoLabels[item.metodo]}</p>
                <p className="mt-2 text-lg font-semibold text-text">{formatMoney(item.total)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-text-muted">
            No hay cobros activos en el periodo seleccionado.
          </div>
        )}
      </Card>

      <Card padding={false}>
        {isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={8} />
          </div>
        ) : isError ? (
          <EmptyState
            title="No se pudo cargar el listado de cobros"
            description="Revisa la conexion y vuelve a intentar."
          />
        ) : cobros.length === 0 ? (
          <EmptyState
            title="Sin cobros para mostrar"
            description="No hay registros que coincidan con los filtros actuales."
            icon={Users}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Orden</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Metodo</th>
                    <th className="px-4 py-3">Registrado por</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Monto</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cobros.map((pago) => (
                    <tr key={pago.id} className="border-b border-border/60 transition hover:bg-surface-2">
                      <td className="px-4 py-3 text-text-muted">{formatDateTime(pago.created_at)}</td>
                      <td className="px-4 py-3">
                        <Link to={`/ordenes/${pago.orden_id}`} className="font-mono font-semibold text-primary hover:underline">
                          {pago.orden_numero}
                        </Link>
                        <div className="text-xs text-text-muted">{pago.patente}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">
                          {pago.cliente_apellido}, {pago.cliente_nombre}
                        </div>
                        {pago.referencia ? <div className="text-xs text-text-muted">Ref: {pago.referencia}</div> : null}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{metodoPagoLabels[pago.metodo]}</td>
                      <td className="px-4 py-3 text-text-muted">{pago.empleado_nombre || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Badge variant={estadoCobroMeta[pago.estado].variant}>{estadoCobroMeta[pago.estado].label}</Badge>
                          {pago.anulado_at ? (
                            <span className="text-xs text-text-muted">
                              {formatDateTime(pago.anulado_at)} · {pago.anulado_por_nombre || "Sistema"}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className={`px-4 py-3 font-semibold ${pago.estado === "anulado" ? "text-text-muted line-through" : "text-green-300"}`}>
                        {formatMoney(pago.monto)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {pago.motivo_anulacion ? (
                            <span className="max-w-40 truncate text-xs text-text-muted" title={pago.motivo_anulacion}>
                              {pago.motivo_anulacion}
                            </span>
                          ) : null}
                          {canEditCobros && pago.estado === "activo" ? (
                            <Button variant="ghost" size="sm" onClick={() => setPagoSeleccionado(pago)}>
                              <Ban size={14} />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {total > 20 ? (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
                <span className="text-text-muted">
                  Mostrando {(page - 1) * 20 + 1} - {Math.min(page * 20, total)} de {total}
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page * 20 >= total}
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

      <AnularPagoModal
        open={Boolean(pagoSeleccionado)}
        pago={pagoSeleccionado}
        onClose={() => setPagoSeleccionado(null)}
        onSuccess={invalidateAll}
      />
    </div>
  );
}

function ResumenCard({
  label,
  value,
  tone,
  compact = false,
}: {
  label: string;
  value: string;
  tone: "green" | "blue" | "gray";
  compact?: boolean;
}) {
  const colorMap = {
    green: "text-green-300",
    blue: "text-blue-300",
    gray: "text-text",
  };

  return (
    <Card>
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`mt-3 font-bold ${compact ? "text-lg" : "text-3xl"} ${colorMap[tone]}`}>{value}</p>
    </Card>
  );
}
