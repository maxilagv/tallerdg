import { useEffect, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  BellRing,
  Car,
  ClipboardList,
  CreditCard,
  Download,
  Pencil,
  Package,
  Printer,
  Save,
  Trash2,
  User,
  Wrench,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ordenesApi, type Orden } from "../../features/ordenes/api";
import {
  estadoCobroMeta,
  estadoPagoMeta,
  metodoPagoLabels,
  type Pago,
} from "../../features/pagos/api";
import { useAuthStore } from "../../shared/store/authStore";
import { useConfirm } from "../../shared/hooks/useConfirm";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ErrorState } from "../../shared/ui/ErrorState";
import { Input } from "../../shared/ui/Input";
import { Skeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { formatDate, formatDateTime, formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { openPdfForPrint } from "../../shared/utils/printPdf";
import { AnularPagoModal } from "../Cobros/AnularPagoModal";
import { RegistrarPagoModal } from "../Cobros/RegistrarPagoModal";
import { AgregarProductoModal } from "./AgregarProductoModal";
import { AgregarServicioModal } from "./AgregarServicioModal";
import { EditarOrdenModal } from "./EditarOrdenModal";

function formatDuracion(inicio: string, fin: string): string {
  const ms = new Date(fin).getTime() - new Date(inicio).getTime();
  if (ms <= 0) return "0 min";
  const totalMin = Math.floor(ms / 60_000);
  const dias = Math.floor(totalMin / 1440);
  const horas = Math.floor((totalMin % 1440) / 60);
  const min = totalMin % 60;
  const partes: string[] = [];
  if (dias > 0) partes.push(`${dias} día${dias !== 1 ? "s" : ""}`);
  if (horas > 0) partes.push(`${horas} hora${horas !== 1 ? "s" : ""}`);
  if (min > 0 && dias === 0) partes.push(`${min} min`);
  return partes.join(", ") || "menos de 1 min";
}

function sumarDias(base: string, dias: number): string {
  const date = new Date(`${base}T12:00:00`);
  date.setDate(date.getDate() + dias);
  return date.toISOString().slice(0, 10);
}

const estadoMeta: Record<
  Orden["estado"],
  { label: string; variant: "blue" | "yellow" | "orange" | "green" | "red" }
> = {
  abierta: { label: "Abierta", variant: "blue" },
  en_proceso: { label: "En proceso", variant: "yellow" },
  lista: { label: "Lista", variant: "orange" },
  cerrada: { label: "Cerrada", variant: "green" },
  cancelada: { label: "Cancelada", variant: "red" },
};

const accionesPorEstado: Record<
  Orden["estado"],
  Array<{ label: string; estado: Orden["estado"]; variant?: "primary" | "secondary" | "danger" }>
> = {
  abierta: [
    { label: "Iniciar trabajo", estado: "en_proceso", variant: "primary" },
    { label: "Cancelar", estado: "cancelada", variant: "danger" },
  ],
  en_proceso: [
    { label: "Marcar como lista", estado: "lista", variant: "primary" },
    { label: "Cancelar", estado: "cancelada", variant: "danger" },
  ],
  lista: [
    { label: "Entregar y cerrar", estado: "cerrada", variant: "primary" },
    { label: "Volver a proceso", estado: "en_proceso", variant: "secondary" },
  ],
  cerrada: [
    { label: "Reabrir trabajo", estado: "en_proceso", variant: "secondary" },
  ],
  cancelada: [],
};

export function OrdenDetalle() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { add } = useToast();
  const hasPermiso = useAuthStore((state) => state.hasPermiso);
  const { id } = useParams<{ id: string }>();
  const [servicioModalOpen, setServicioModalOpen] = useState(false);
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [registroPagoOpen, setRegistroPagoOpen] = useState(false);
  const [editarOrdenOpen, setEditarOrdenOpen] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Pago | null>(null);
  const [notasCliente, setNotasCliente] = useState("");
  const [notasMecanico, setNotasMecanico] = useState("");
  const [kmEntrada, setKmEntrada] = useState("0");
  const [descuento, setDescuento] = useState("0");
  const [ivaPorcentaje, setIvaPorcentaje] = useState("0");
  const [recordatorioServicio, setRecordatorioServicio] = useState("");
  const [recordatorioKmBase, setRecordatorioKmBase] = useState("0");
  const [recordatorioKmProximo, setRecordatorioKmProximo] = useState("");
  const [recordatorioKmPorDia, setRecordatorioKmPorDia] = useState("");
  const { confirm, confirmModalProps } = useConfirm();

  const ordenQuery = useQuery({
    queryKey: ["orden", id],
    queryFn: () => ordenesApi.obtener(Number(id)),
    enabled: Boolean(id),
  });

  const orden = ordenQuery.data?.data.data;
  const pagos = orden?.pagos ?? [];
  const editable = orden ? !["cerrada", "cancelada"].includes(orden.estado) : false;
  const canWriteCobros = hasPermiso("cobros", "w");
  const puedeRegistrarCobros = Boolean(orden && orden.estado !== "cancelada" && canWriteCobros);
  const botonCobroLabel = orden?.estado === "cerrada" ? "Registrar cobro" : "Registrar adelanto";
  const canWriteOrdenes = hasPermiso("ordenes", "w");
  const kmBasePreview = Number(recordatorioKmBase || 0);
  const kmProximoPreview = Number(recordatorioKmProximo || 0);
  const kmPorDiaPreview = Number(recordatorioKmPorDia || 0);
  const recordatorioDiasEstimados =
    kmProximoPreview > kmBasePreview && kmPorDiaPreview > 0
      ? Math.ceil((kmProximoPreview - kmBasePreview) / kmPorDiaPreview)
      : 0;
  const recordatorioFechaBase = orden?.closed_at
    ? String(orden.closed_at).slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const recordatorioFechaEstimada = recordatorioDiasEstimados > 0
    ? sumarDias(recordatorioFechaBase, recordatorioDiasEstimados)
    : null;

  useEffect(() => {
    if (!orden) {
      return;
    }

    setNotasCliente(orden.notas_cliente || "");
    setNotasMecanico(orden.notas_mecanico || "");
    setKmEntrada(String(orden.km_entrada || 0));
    setDescuento(String(orden.descuento || 0));
    setIvaPorcentaje(String(orden.iva_porcentaje || 0));
    setRecordatorioServicio(orden.recordatorio_service?.servicio || orden.servicios[0]?.descripcion || "");
    setRecordatorioKmBase(String(orden.recordatorio_service?.km_base ?? orden.km_entrada ?? 0));
    setRecordatorioKmProximo(
      orden.recordatorio_service?.km_proximo ? String(orden.recordatorio_service.km_proximo) : ""
    );
    setRecordatorioKmPorDia(
      orden.recordatorio_service?.km_por_dia ? String(orden.recordatorio_service.km_por_dia) : ""
    );
  }, [orden]);

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["orden", id] }),
      queryClient.invalidateQueries({ queryKey: ["ordenes"] }),
      queryClient.invalidateQueries({ queryKey: ["cobros"] }),
      queryClient.invalidateQueries({ queryKey: ["vehiculo"] }),
      queryClient.invalidateQueries({ queryKey: ["vehiculos"] }),
      queryClient.invalidateQueries({ queryKey: ["productos"] }),
      queryClient.invalidateQueries({ queryKey: ["productos-stock-bajo"] }),
      queryClient.invalidateQueries({ queryKey: ["sidebar-stock-bajo"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-stock-bajo"] }),
      queryClient.invalidateQueries({ queryKey: ["finanzas-resumen"] }),
      queryClient.invalidateQueries({ queryKey: ["finanzas-por-dia"] }),
      queryClient.invalidateQueries({ queryKey: ["finanzas-categorias"] }),
      queryClient.invalidateQueries({ queryKey: ["finanzas-movimientos"] }),
      queryClient.invalidateQueries({ queryKey: ["cliente-deuda"] }),
    ]);
  };

  const notasMutation = useMutation({
    mutationFn: () =>
      ordenesApi.actualizarNotas(Number(id), {
        notas_cliente: notasCliente,
        notas_mecanico: notasMecanico,
        km_entrada: Number(kmEntrada || 0),
      }),
    onSuccess: async () => {
      add("Notas actualizadas.");
      await invalidateAll();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const descuentoMutation = useMutation({
    mutationFn: () => ordenesApi.aplicarDescuento(Number(id), Number(descuento || 0)),
    onSuccess: async () => {
      add("Descuento actualizado.");
      await invalidateAll();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const ivaMutation = useMutation({
    mutationFn: () => ordenesApi.aplicarIva(Number(id), Number(ivaPorcentaje || 0)),
    onSuccess: async () => {
      add("IVA actualizado.");
      await invalidateAll();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const recordatorioMutation = useMutation({
    mutationFn: () =>
      ordenesApi.actualizarRecordatorioService(Number(id), {
        servicio: recordatorioServicio,
        km_base: Number(recordatorioKmBase || 0),
        km_proximo: Number(recordatorioKmProximo || 0),
        km_por_dia: Number(recordatorioKmPorDia || 0),
      }),
    onSuccess: async () => {
      add("Recordatorio de service actualizado.");
      await invalidateAll();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const eliminarRecordatorioMutation = useMutation({
    mutationFn: () => ordenesApi.eliminarRecordatorioService(Number(id)),
    onSuccess: async () => {
      add("Recordatorio de service desactivado.");
      await invalidateAll();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const estadoMutation = useMutation({
    mutationFn: (estado: Orden["estado"]) => ordenesApi.cambiarEstado(Number(id), estado),
    onSuccess: async () => {
      add("Estado actualizado.");
      await invalidateAll();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const eliminarOrdenMutation = useMutation({
    mutationFn: () => ordenesApi.eliminar(Number(id)),
    onSuccess: async () => {
      add("Orden cancelada eliminada.");
      await queryClient.invalidateQueries({ queryKey: ["ordenes"] });
      navigate("/ordenes");
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const quitarServicioMutation = useMutation({
    mutationFn: (itemId: number) => ordenesApi.quitarServicio(Number(id), itemId),
    onSuccess: async () => {
      add("Servicio quitado.");
      await invalidateAll();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const quitarProductoMutation = useMutation({
    mutationFn: (itemId: number) => ordenesApi.quitarProducto(Number(id), itemId),
    onSuccess: async () => {
      add("Producto quitado.");
      await invalidateAll();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const descargarRemitoMutation = useMutation({
    mutationFn: () => ordenesApi.descargarRemito(Number(id)),
    onSuccess: ({ data }) => {
      const url = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `remito-${orden?.remito_numero || orden?.numero || "orden"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const imprimirOrdenMutation = useMutation({
    mutationFn: () => ordenesApi.imprimirOrdenTrabajo(Number(id)),
    onSuccess: ({ data }) => {
      openPdfForPrint(data, `orden-trabajo-${orden?.numero || "orden"}.pdf`);
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  if (ordenQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (ordenQuery.isError) {
    return (
      <ErrorState
        title="No se encontro el trabajo"
        description="La orden que buscas no existe o fue eliminada."
        backTo="/ordenes"
        backLabel="Ir a trabajos"
        onRetry={() => ordenQuery.refetch()}
      />
    );
  }

  if (!orden) {
    return <div className="text-text-muted">Trabajo no encontrado.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Volver
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-2xl font-bold text-primary">{orden.numero}</span>
              <Badge variant={estadoMeta[orden.estado].variant}>{estadoMeta[orden.estado].label}</Badge>
              <Badge variant={estadoPagoMeta[orden.estado_pago].variant}>
                {estadoPagoMeta[orden.estado_pago].label}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              Creada el {formatDate(orden.created_at)}
              {orden.closed_at && (
                <>
                  {" · "}Cerrada el {formatDate(orden.closed_at)}
                  <span className="ml-1 rounded-lg bg-surface-3 px-2 py-0.5 text-xs font-medium text-text">
                    ⏱ {formatDuracion(orden.created_at, orden.closed_at)}
                  </span>
                </>
              )}
              {" · "}{orden.patente} · {orden.marca} {orden.modelo}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {editable && canWriteOrdenes ? (
            <Button variant="secondary" onClick={() => setEditarOrdenOpen(true)}>
              <Pencil size={16} /> Editar orden
            </Button>
          ) : null}

          {puedeRegistrarCobros && (orden.estado !== "cerrada" || Number(orden.saldo_pendiente) > 0) ? (
            <Button onClick={() => setRegistroPagoOpen(true)}>
              <CreditCard size={16} /> {botonCobroLabel}
            </Button>
          ) : null}

          <Button
            variant="secondary"
            onClick={() => imprimirOrdenMutation.mutate()}
            loading={imprimirOrdenMutation.isPending}
          >
            <Printer size={16} /> Imprimir orden
          </Button>

          {accionesPorEstado[orden.estado].map((accion) => (
            <Button
              key={accion.estado}
              variant={accion.variant || "secondary"}
              onClick={() => estadoMutation.mutate(accion.estado)}
              loading={estadoMutation.isPending}
            >
              {accion.label}
            </Button>
          ))}

          {orden.estado === "cerrada" ? (
            <Button
              variant="secondary"
              onClick={() => descargarRemitoMutation.mutate()}
              loading={descargarRemitoMutation.isPending}
            >
              <Download size={16} /> Descargar remito
            </Button>
          ) : null}

          {orden.estado === "cancelada" && canWriteOrdenes ? (
            <Button
              variant="danger"
              onClick={async () => {
                const ok = await confirm({
                  title: "Eliminar orden cancelada",
                  description: "Se quitara la orden y se repondra el stock de sus productos. No se permite si tiene cobros registrados.",
                  confirmLabel: "Eliminar",
                  variant: "danger",
                });

                if (ok) eliminarOrdenMutation.mutate();
              }}
              loading={eliminarOrdenMutation.isPending}
            >
              <Trash2 size={16} /> Eliminar
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_360px]">
        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-text">
                <Wrench size={16} /> Servicios
              </h2>
              {editable ? (
                <Button size="sm" onClick={() => setServicioModalOpen(true)}>
                  Agregar servicio
                </Button>
              ) : null}
            </div>

            {orden.servicios.length ? (
              <div className="mt-4 space-y-2">
                {orden.servicios.map((servicio) => (
                  <div key={servicio.id} className="rounded-xl border border-border bg-surface-2 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-text">{servicio.descripcion || servicio.servicio_nombre}</p>
                        <p className="mt-1 text-xs text-text-muted">
                          {servicio.cantidad} × {formatMoney(servicio.precio_unitario)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text">{formatMoney(servicio.subtotal)}</span>
                        {editable ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const ok = await confirm({
                                title: "¿Quitar este servicio?",
                                description: "Se recalculara el total automaticamente.",
                                confirmLabel: "Si, quitar",
                                variant: "warning",
                              });

                              if (ok) {
                                quitarServicioMutation.mutate(servicio.id);
                              }
                            }}
                          >
                            <X size={14} />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  title="Todavia no hay servicios cargados"
                  description="Agrega mano de obra para empezar a construir el detalle del trabajo."
                  icon={Wrench}
                />
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-text">
                <Package size={16} /> Productos y repuestos
              </h2>
              {editable ? (
                <Button size="sm" onClick={() => setProductoModalOpen(true)}>
                  Agregar producto
                </Button>
              ) : null}
            </div>

            {orden.productos.length ? (
              <div className="mt-4 space-y-2">
                {orden.productos.map((producto) => (
                  <div key={producto.id} className="rounded-xl border border-border bg-surface-2 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-text">{producto.descripcion || producto.producto_nombre}</p>
                        <p className="mt-1 text-xs text-text-muted">
                          {producto.cantidad} {producto.unidad || "unidad"} · {formatMoney(producto.precio_unitario)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text">{formatMoney(producto.subtotal)}</span>
                        {editable ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const ok = await confirm({
                                title: "¿Quitar este producto?",
                                description: "El stock sera devuelto automaticamente y se recalculara el total.",
                                confirmLabel: "Si, quitar",
                                variant: "warning",
                              });

                              if (ok) {
                                quitarProductoMutation.mutate(producto.id);
                              }
                            }}
                          >
                            <X size={14} />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  title="Todavia no hay productos cargados"
                  description="Agrega repuestos o insumos usados en esta orden para descontarlos del stock."
                  icon={Package}
                />
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-text">Notas y kilometraje</h2>
              {editable ? (
                <Button onClick={() => notasMutation.mutate()} loading={notasMutation.isPending}>
                  <Save size={16} /> Guardar
                </Button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-muted">Notas del cliente</label>
                <textarea
                  rows={5}
                  value={notasCliente}
                  onChange={(event) => setNotasCliente(event.target.value)}
                  disabled={!editable}
                  className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary disabled:opacity-70"
                />
              </div>
              <div className="flex flex-col gap-3">
                <Input
                  label="Km de entrada"
                  type="number"
                  min="0"
                  value={kmEntrada}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setKmEntrada(event.target.value)}
                  disabled={!editable}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-muted">Notas del mecanico</label>
                  <textarea
                    rows={5}
                    value={notasMecanico}
                    onChange={(event) => setNotasMecanico(event.target.value)}
                    disabled={!editable}
                    className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary disabled:opacity-70"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-text">
                <CreditCard size={16} /> Cobros
              </h2>
              {puedeRegistrarCobros && (orden.estado !== "cerrada" || Number(orden.saldo_pendiente) > 0) ? (
                <Button size="sm" onClick={() => setRegistroPagoOpen(true)}>
                  {botonCobroLabel}
                </Button>
              ) : null}
            </div>

            {orden.estado === "cancelada" ? (
              <div className="mt-4 rounded-xl border border-border bg-surface-2 px-4 py-4 text-sm text-text-muted">
                La orden esta cancelada. No se pueden registrar nuevos movimientos de cobro.
              </div>
            ) : pagos.length ? (
              <div className="mt-4 space-y-3">
                {pagos.map((pago) => (
                  <div
                    key={pago.id}
                    className={`rounded-xl border px-4 py-3 ${
                      pago.estado === "anulado"
                        ? "border-red-500/20 bg-red-500/5"
                        : "border-border bg-surface-2"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={estadoCobroMeta[pago.estado].variant}>
                            {estadoCobroMeta[pago.estado].label}
                          </Badge>
                          <span className="text-sm font-medium text-text">{metodoPagoLabels[pago.metodo]}</span>
                          <span className="text-sm text-text-muted">{formatDateTime(pago.created_at)}</span>
                        </div>

                        <div className="text-sm text-text-muted">
                          Registrado por {pago.empleado_nombre || "usuario no identificado"}
                        </div>

                        {pago.referencia ? (
                          <div className="text-sm text-text-muted">Referencia: {pago.referencia}</div>
                        ) : null}

                        {pago.notas ? <div className="text-sm text-text-muted">Notas: {pago.notas}</div> : null}

                        {pago.estado === "anulado" ? (
                          <div className="rounded-xl border border-red-500/15 bg-red-500/5 px-3 py-2 text-sm text-red-200">
                            Anulado el {pago.anulado_at ? formatDateTime(pago.anulado_at) : "-"} por{" "}
                            {pago.anulado_por_nombre || "usuario"}.
                            {pago.motivo_anulacion ? ` Motivo: ${pago.motivo_anulacion}` : ""}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-lg font-bold ${
                            pago.estado === "anulado" ? "text-text-muted line-through" : "text-green-300"
                          }`}
                        >
                          {formatMoney(pago.monto)}
                        </span>
                        {canWriteCobros && pago.estado === "activo" ? (
                          <Button variant="ghost" size="sm" onClick={() => setPagoSeleccionado(pago)}>
                            <Ban size={14} />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  title="Todavia no hay cobros registrados"
                  description="Los adelantos y cobros parciales de esta orden apareceran aqui con su trazabilidad completa."
                  icon={CreditCard}
                />
              </div>
            )}

            {orden.estado !== "cancelada" && orden.estado !== "cerrada" ? (
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 text-sm text-text">
                Puedes registrar adelantos aun con la orden abierta, en proceso o lista. El saldo pendiente se actualiza automaticamente.
              </div>
            ) : null}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <h2 className="text-base font-semibold text-text">Datos vinculados</h2>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <User size={16} className="mt-1 text-text-muted" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">Cliente</p>
                  <Link to={`/clientes/${orden.cliente_id}`} className="font-medium text-primary transition hover:underline">
                    {orden.cliente_apellido}, {orden.cliente_nombre}
                  </Link>
                  <p className="text-sm text-text-muted">{orden.cliente_telefono || "Sin telefono"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Car size={16} className="mt-1 text-text-muted" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">Vehiculo</p>
                  <Link to={`/vehiculos/${orden.vehiculo_id}`} className="font-medium text-primary transition hover:underline">
                    {orden.patente} · {orden.marca} {orden.modelo}
                  </Link>
                  <p className="text-sm text-text-muted">
                    {orden.anio || "Año no registrado"} · {orden.tipo_combustible || "Combustible no registrado"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-text">Resumen economico</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Subtotal</span>
                <span className="font-medium text-text">{formatMoney(orden.subtotal)}</span>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-text-muted">Descuento</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={descuento}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setDescuento(event.target.value)}
                    onBlur={() => {
                      const num = Number(descuento);
                      if (isNaN(num) || num < 0) setDescuento("0");
                    }}
                    disabled={!editable}
                  />
                  {editable ? (
                    <Button onClick={() => descuentoMutation.mutate()} loading={descuentoMutation.isPending}>
                      Aplicar
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-text-muted">IVA (%)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={ivaPorcentaje}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setIvaPorcentaje(event.target.value)}
                    onBlur={() => {
                      const num = Number(ivaPorcentaje);
                      if (isNaN(num) || num < 0) setIvaPorcentaje("0");
                      else if (num > 100) setIvaPorcentaje("100");
                    }}
                    disabled={!editable}
                  />
                  {editable ? (
                    <Button onClick={() => ivaMutation.mutate()} loading={ivaMutation.isPending}>
                      Aplicar
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2 rounded-xl bg-surface-2 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Base imponible</span>
                  <span className="font-medium text-text">
                    {formatMoney(Math.max(0, Number(orden.subtotal) - Number(orden.descuento || 0)))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">IVA</span>
                  <span className="font-medium text-text">{formatMoney(orden.iva_monto || 0)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-2">
                  <span className="font-medium text-text">Total de la orden</span>
                  <span className="text-xl font-bold text-text">{formatMoney(orden.total)}</span>
                </div>
              </div>

              {/* Adelanto al ingreso */}
              {Number(orden.adelanto) > 0 && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-primary">Adelanto al ingreso</span>
                      {orden.adelanto_metodo && (
                        <span className="ml-2 text-xs text-text-muted capitalize">
                          ({orden.adelanto_metodo.replace(/_/g, " ")})
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-primary">
                      − {formatMoney(Number(orden.adelanto))}
                    </span>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-border bg-surface-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-text-muted">Estado de cobro</span>
                  <Badge variant={estadoPagoMeta[orden.estado_pago].variant}>
                    {estadoPagoMeta[orden.estado_pago].label}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Total cobrado</span>
                    <span className="font-medium text-green-300">{formatMoney(orden.total_pagado)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text">Saldo pendiente</span>
                    <span className={`text-lg font-bold ${Number(orden.saldo_pendiente) > 0 ? "text-red-300" : "text-green-300"}`}>
                      {formatMoney(orden.saldo_pendiente)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Cobros registrados</span>
                    <span className="font-medium text-text">{orden.cantidad_pagos}</span>
                  </div>
                </div>
              </div>

              {orden.estado === "cerrada" && Number(orden.saldo_pendiente) > 0 ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
                  Esta orden esta cerrada pero aun tiene saldo pendiente por cobrar.
                </div>
              ) : null}

              {orden.closed_at ? (
                <p className="text-xs text-text-muted">
                  Cerrada el {formatDate(orden.closed_at)} · Duración: {formatDuracion(orden.created_at, orden.closed_at)}
                </p>
              ) : null}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-text">
                <BellRing size={16} /> Proximo service
              </h2>
              {orden.recordatorio_service?.activo ? (
                <Badge variant="blue">Activo</Badge>
              ) : orden.recordatorio_service?.enviado_at ? (
                <Badge variant="green">Enviado</Badge>
              ) : (
                <Badge variant="gray">Sin programar</Badge>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <Input
                label="Servicio a recordar"
                value={recordatorioServicio}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setRecordatorioServicio(event.target.value)}
                disabled={!canWriteOrdenes || orden.estado === "cancelada"}
              />

              {orden.servicios.length ? (
                <div className="flex flex-wrap gap-2">
                  {orden.servicios.map((servicio) => (
                    <button
                      key={servicio.id}
                      type="button"
                      onClick={() => setRecordatorioServicio(servicio.descripcion || servicio.servicio_nombre)}
                      className="rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs text-text transition hover:border-primary hover:text-primary"
                    >
                      {servicio.descripcion || servicio.servicio_nombre}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  label="Km base"
                  type="number"
                  min="0"
                  value={recordatorioKmBase}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setRecordatorioKmBase(event.target.value)}
                  disabled={!canWriteOrdenes || orden.estado === "cancelada"}
                />
                <Input
                  label="Proximo a los km"
                  type="number"
                  min="1"
                  value={recordatorioKmProximo}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setRecordatorioKmProximo(event.target.value)}
                  disabled={!canWriteOrdenes || orden.estado === "cancelada"}
                />
                <Input
                  label="Km por dia"
                  type="number"
                  min="1"
                  step="0.01"
                  value={recordatorioKmPorDia}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setRecordatorioKmPorDia(event.target.value)}
                  disabled={!canWriteOrdenes || orden.estado === "cancelada"}
                />
              </div>

              <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm">
                <p className="font-medium text-text">Calculo estimado</p>
                <p className="mt-1 text-text-muted">Fecha base: {formatDate(recordatorioFechaBase)}</p>
                <p className="mt-1 text-text-muted">
                  {recordatorioFechaEstimada
                    ? `Enviar aproximadamente el ${formatDate(recordatorioFechaEstimada)} (${recordatorioDiasEstimados} dia${recordatorioDiasEstimados !== 1 ? "s" : ""}).`
                    : "Completa km objetivo y km por dia para calcular el envio automatico."}
                </p>
              </div>

              {!orden.cliente_telefono ? (
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-200">
                  El cliente no tiene telefono cargado. Puedes dejar el recordatorio configurado, pero WhatsApp no podra enviarlo hasta completar ese dato.
                </div>
              ) : null}

              {orden.recordatorio_service?.enviado_at ? (
                <p className="text-xs text-text-muted">
                  Ultimo envio: {formatDateTime(orden.recordatorio_service.enviado_at)}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {canWriteOrdenes && orden.estado !== "cancelada" ? (
                  <Button onClick={() => recordatorioMutation.mutate()} loading={recordatorioMutation.isPending}>
                    Guardar recordatorio
                  </Button>
                ) : null}
                {canWriteOrdenes && orden.recordatorio_service?.activo ? (
                  <Button
                    variant="secondary"
                    onClick={() => eliminarRecordatorioMutation.mutate()}
                    loading={eliminarRecordatorioMutation.isPending}
                  >
                    Desactivar
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-base font-semibold text-text">
              <ClipboardList size={16} /> Historial rapido del vehiculo
            </h2>

            {orden.historial_vehiculo?.length ? (
              <div className="mt-4 space-y-2">
                {orden.historial_vehiculo.map((historial) => (
                  <button
                    key={historial.id}
                    onClick={() => navigate(`/ordenes/${historial.id}`)}
                    className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-left transition hover:bg-surface-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-sm font-medium text-primary">{historial.numero}</span>
                      <span className="font-semibold text-text">{formatMoney(historial.total)}</span>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      {historial.closed_at ? formatDate(historial.closed_at) : "Sin cierre"} ·{" "}
                      {(historial.km_entrada ?? 0).toLocaleString("es-AR")} km
                    </p>
                    {historial.notas_mecanico ? (
                      <p className="mt-1 truncate text-xs text-text-muted">{historial.notas_mecanico}</p>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  title="No hay visitas anteriores"
                  description="Cuando este vehiculo tenga trabajos cerrados vas a ver aqui sus ultimos ingresos."
                  icon={ClipboardList}
                />
              </div>
            )}
          </Card>
        </div>
      </div>

      <AgregarServicioModal
        open={servicioModalOpen}
        ordenId={orden.id}
        onClose={() => setServicioModalOpen(false)}
        onSuccess={invalidateAll}
      />

      <AgregarProductoModal
        open={productoModalOpen}
        ordenId={orden.id}
        onClose={() => setProductoModalOpen(false)}
        onSuccess={invalidateAll}
      />

      <EditarOrdenModal
        open={editarOrdenOpen}
        orden={orden}
        onClose={() => setEditarOrdenOpen(false)}
        onSuccess={invalidateAll}
      />

      <RegistrarPagoModal
        open={registroPagoOpen}
        orden={orden}
        onClose={() => setRegistroPagoOpen(false)}
        onSuccess={invalidateAll}
      />

      <AnularPagoModal
        open={Boolean(pagoSeleccionado)}
        pago={pagoSeleccionado}
        onClose={() => setPagoSeleccionado(null)}
        onSuccess={invalidateAll}
      />

      <ConfirmModal
        {...confirmModalProps}
        loading={quitarServicioMutation.isPending || quitarProductoMutation.isPending || eliminarOrdenMutation.isPending}
      />
    </div>
  );
}
