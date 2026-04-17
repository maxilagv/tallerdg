import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircleMore, RefreshCw, RotateCcw, Save } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { whatsappApi, type WhatsAppTemplate } from "../../features/whatsapp/api";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { TableSkeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { formatDateTime } from "../../shared/utils/format";

export function WhatsappPage() {
  const queryClient = useQueryClient();
  const { add } = useToast();
  const [page, setPage] = useState(1);
  const [tipo, setTipo] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [templatesDraft, setTemplatesDraft] = useState<Record<number, string>>({});

  const estadoQuery = useQuery({
    queryKey: ["whatsapp-estado"],
    queryFn: () => whatsappApi.getEstado(),
    refetchInterval: (query) => {
      const estado = query.state.data?.data.data.estado;
      if (estado === "qr" || estado === "inicializando") return 1000;
      if (estado === "error") return 5000;
      return 30000;
    },
    refetchOnWindowFocus: true,
  });

  const templatesQuery = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: () => whatsappApi.getTemplates(),
  });

  const logQuery = useQuery({
    queryKey: ["whatsapp-log", page, tipo, estadoFiltro],
    queryFn: () =>
      whatsappApi.getLog({
        page,
        limit: 10,
        tipo: tipo || undefined,
        estado: estadoFiltro || undefined,
      }),
  });

  useEffect(() => {
    const templates = templatesQuery.data?.data.data;
    if (!templates) return;

    setTemplatesDraft(
      templates.reduce<Record<number, string>>((accumulator, template) => {
        accumulator[template.id] = template.texto;
        return accumulator;
      }, {})
    );
  }, [templatesQuery.data]);

  const conectarMutation = useMutation({
    mutationFn: () => whatsappApi.conectar(),
    onSuccess: () => {
      add("Inicializacion de WhatsApp solicitada.");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-estado"] });
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const desconectarMutation = useMutation({
    mutationFn: () => whatsappApi.desconectar(),
    onSuccess: () => {
      add("WhatsApp desconectado.");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-estado"] });
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const reiniciarMutation = useMutation({
    mutationFn: () => whatsappApi.reiniciar(),
    onSuccess: () => {
      add("QR reiniciado.");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-estado"] });
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, texto }: { id: number; texto: string }) =>
      whatsappApi.updateTemplate(id, { texto }),
    onSuccess: () => {
      add("Template actualizado.");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const estado = estadoQuery.data?.data.data;
  const templates = templatesQuery.data?.data.data ?? [];
  const log = logQuery.data?.data.data.rows ?? [];
  const total = logQuery.data?.data.data.total ?? 0;
  const templateTypes = useMemo(() => templates.map((template) => template.tipo), [templates]);
  const isQrVisible = estado?.estado === "qr" && Boolean(estado.qrCode);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text">WhatsApp del taller</h1>
        <p className="mt-1 text-sm text-text-muted">
          Gestiona la conexion, edita los mensajes automaticos y revisa el historial de envios.
        </p>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-text">Estado de la conexion</h2>
            <p className="mt-1 text-sm text-text-muted">
              El sistema intenta restaurar la sesion anterior cuando el backend arranca.
            </p>
          </div>
          <EstadoBadge estado={estado?.estado} />
        </div>

        {estadoQuery.isLoading ? (
          <p className="text-sm text-text-muted">Consultando estado de WhatsApp...</p>
        ) : isQrVisible ? (
          <QrPanel
            qrCode={estado?.qrCode || ""}
            qrVersion={estado?.qrVersion}
            qrUpdatedAt={estado?.qrUpdatedAt}
          />
        ) : estado?.estado === "conectado" ? (
          <div className="space-y-2">
            <p className="text-sm text-green-300">
              WhatsApp conectado. Los mensajes automaticos estan activos.
            </p>
            {estado.browserPath ? (
              <p className="text-xs text-text-muted">Navegador en uso: {estado.browserPath}</p>
            ) : null}
          </div>
        ) : estado?.estado === "desactivado" ? (
          <p className="text-sm text-text-muted">
            WhatsApp esta desactivado desde la configuracion del sistema.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-text-muted">
              {estado?.lastError ||
                "WhatsApp esta desconectado. Puedes iniciar la conexion cuando quieras."}
            </p>
            {estado?.browserPath ? (
              <p className="text-xs text-text-muted">Navegador detectado: {estado.browserPath}</p>
            ) : null}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {estado?.estado !== "conectado" ? (
            <Button onClick={() => conectarMutation.mutate()} loading={conectarMutation.isPending}>
              Conectar WhatsApp
            </Button>
          ) : (
            <Button
              variant="danger"
              onClick={() => desconectarMutation.mutate()}
              loading={desconectarMutation.isPending}
            >
              Desconectar
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => reiniciarMutation.mutate()}
            loading={reiniciarMutation.isPending}
          >
            <RotateCcw size={15} /> Regenerar QR
          </Button>

          <Button
            variant="secondary"
            onClick={() => estadoQuery.refetch()}
            loading={estadoQuery.isFetching}
          >
            <RefreshCw size={15} /> Actualizar estado
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-text">Mensajes automaticos</h2>
        <p className="mt-1 text-sm text-text-muted">
          Personaliza el texto de cada mensaje. Puedes usar {"{nombre}"}, {"{patente}"},{" "}
          {"{total}"} y otras variables que el sistema reemplaza automaticamente.
        </p>

        <div className="mt-4 space-y-4">
          {templatesQuery.isLoading ? (
            <TableSkeleton rows={3} />
          ) : templates.length ? (
            templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                value={templatesDraft[template.id] ?? template.texto}
                onChange={(value) =>
                  setTemplatesDraft((state) => ({ ...state, [template.id]: value }))
                }
                onSave={() =>
                  updateTemplateMutation.mutate({
                    id: template.id,
                    texto: templatesDraft[template.id] ?? template.texto,
                  })
                }
                saving={
                  updateTemplateMutation.isPending &&
                  updateTemplateMutation.variables?.id === template.id
                }
              />
            ))
          ) : (
            <EmptyState
              title="No hay templates cargados"
              description="Las automatizaciones apareceran aca cuando el modulo este inicializado."
              icon={MessageCircleMore}
            />
          )}
        </div>
      </Card>

      <Card padding={false}>
        <div className="border-b border-border px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-semibold text-text">Historial de mensajes</h2>
              <p className="mt-1 text-sm text-text-muted">
                Seguimiento de envios pendientes, enviados y fallidos.
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <select
                value={tipo}
                onChange={(event) => {
                  setTipo(event.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              >
                <option value="">Todos los tipos</option>
                {templateTypes.map((templateType) => (
                  <option key={templateType} value={templateType}>
                    {templateType}
                  </option>
                ))}
              </select>
              <select
                value={estadoFiltro}
                onChange={(event) => {
                  setEstadoFiltro(event.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="enviado">Enviado</option>
                <option value="fallido">Fallido</option>
              </select>
            </div>
          </div>
        </div>

        {logQuery.isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={5} />
          </div>
        ) : log.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Destinatario</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/60 transition hover:bg-surface-2"
                    >
                      <td className="px-4 py-3 text-text-muted">
                        {formatDateTime(item.created_at)}
                      </td>
                      <td className="px-4 py-3 text-text">{item.tipo}</td>
                      <td className="px-4 py-3 text-text-muted">{item.destinatario}</td>
                      <td className="px-4 py-3">
                        <EstadoMensajeBadge estado={item.estado} />
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {item.estado === "fallido"
                          ? item.error_detalle || "Sin detalle"
                          : item.contenido}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {total > 10 ? (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
                <span className="text-text-muted">
                  Mostrando {(page - 1) * 10 + 1} - {Math.min(page * 10, total)} de {total}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page * 10 >= total}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="p-5">
            <EmptyState
              title="Todavia no se enviaron mensajes"
              description="Cada mensaje que el sistema envie automaticamente va a aparecer aqui con su estado."
              icon={MessageCircleMore}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

function QrPanel({
  qrCode,
  qrVersion,
  qrUpdatedAt,
}: {
  qrCode: string;
  qrVersion?: number;
  qrUpdatedAt?: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <p className="max-w-xl text-center text-sm text-text-muted">
        Escanea este codigo con WhatsApp en tu telefono para conectar el sistema. Si no lo toma en
        un segundo, usa "Regenerar QR" para pedir uno nuevo.
      </p>

      <div className="rounded-3xl border border-border bg-white p-5 shadow-lg shadow-black/10">
        <QRCodeSVG
          key={qrCode}
          value={qrCode}
          size={320}
          level="L"
          marginSize={4}
          bgColor="#FFFFFF"
          fgColor="#000000"
          title="QR de vinculacion de WhatsApp"
        />
      </div>

      <div className="space-y-1 text-center text-xs text-text-muted">
        <p>Abre WhatsApp {"->"} Dispositivos vinculados {"->"} Vincular un dispositivo.</p>
        {qrUpdatedAt ? <p>Ultima actualizacion: {formatDateTime(qrUpdatedAt)}</p> : null}
        {typeof qrVersion === "number" ? <p>Version del QR: {qrVersion}</p> : null}
      </div>
    </div>
  );
}

const tipoLabels: Record<string, string> = {
  orden_cerrada: "Trabajo listo para retirar",
  recordatorio_deuda: "Recordatorio de deuda",
  proximo_service: "Recordatorio de proximo service",
  service_programado: "Recordatorio por service programado",
};

const tipoVariables: Record<string, { key: string; label: string }[]> = {
  orden_cerrada: [
    { key: "nombre", label: "Nombre cliente" },
    { key: "patente", label: "Patente" },
    { key: "servicios", label: "Servicios realizados" },
    { key: "total", label: "Total a pagar" },
    { key: "taller", label: "Nombre del taller" },
  ],
  recordatorio_deuda: [
    { key: "nombre", label: "Nombre cliente" },
    { key: "monto", label: "Monto adeudado" },
    { key: "taller", label: "Nombre del taller" },
  ],
  proximo_service: [
    { key: "nombre", label: "Nombre cliente" },
    { key: "marca", label: "Marca del vehiculo" },
    { key: "modelo", label: "Modelo" },
    { key: "patente", label: "Patente" },
    { key: "km_proximo", label: "Km estimado del service" },
    { key: "telefono", label: "Telefono del taller" },
  ],
  service_programado: [
    { key: "nombre", label: "Nombre cliente" },
    { key: "servicio", label: "Servicio" },
    { key: "patente", label: "Patente" },
    { key: "km_proximo", label: "Km estimado" },
    { key: "telefono", label: "Telefono del taller" },
  ],
};

function TemplateCard({
  template,
  value,
  onChange,
  onSave,
  saving,
}: {
  template: WhatsAppTemplate;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const variables = tipoVariables[template.tipo] ?? [];

  function insertarVariable(key: string) {
    const element = textareaRef.current;
    if (!element) {
      onChange(value + `{${key}}`);
      return;
    }

    const start = element.selectionStart ?? value.length;
    const end = element.selectionEnd ?? value.length;
    const insert = `{${key}}`;
    const next = value.slice(0, start) + insert + value.slice(end);
    onChange(next);

    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + insert.length, start + insert.length);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-text">{tipoLabels[template.tipo] ?? template.tipo}</p>
          <p className="text-xs text-text-muted">
            Actualizado el {formatDateTime(template.updated_at)}
          </p>
        </div>
        <Badge variant={template.activo ? "green" : "gray"}>
          {template.activo ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      {variables.length > 0 && (
        <div className="mb-2">
          <p className="mb-1.5 text-xs text-text-muted">
            Inserta una variable. El sistema la reemplaza automaticamente al enviar:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {variables.map((variable) => (
              <button
                key={variable.key}
                type="button"
                onClick={() => insertarVariable(variable.key)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-primary transition hover:border-primary hover:bg-primary/10"
              >
                {`{${variable.key}}`} <span className="text-text-muted">- {variable.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <textarea
        ref={textareaRef}
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
      />

      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={onSave} loading={saving}>
          <Save size={14} /> Guardar mensaje
        </Button>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado?: string }) {
  if (estado === "conectado") return <Badge variant="green">Conectado</Badge>;
  if (estado === "qr") return <Badge variant="yellow">Esperando QR</Badge>;
  if (estado === "inicializando") return <Badge variant="blue">Inicializando</Badge>;
  if (estado === "desactivado") return <Badge variant="gray">Desactivado</Badge>;
  if (estado === "error") return <Badge variant="red">Error</Badge>;
  return <Badge variant="gray">Desconectado</Badge>;
}

function EstadoMensajeBadge({ estado }: { estado: "pendiente" | "enviado" | "fallido" }) {
  if (estado === "enviado") return <Badge variant="green">Enviado</Badge>;
  if (estado === "fallido") return <Badge variant="red">Fallido</Badge>;
  return <Badge variant="yellow">Pendiente</Badge>;
}
