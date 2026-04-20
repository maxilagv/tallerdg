import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Megaphone, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { ofertasApi, type Oferta } from "../../features/ofertas/api";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { EmptyState } from "../../shared/ui/EmptyState";
import { TableSkeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { useConfirm } from "../../shared/hooks/useConfirm";
import { formatDateTime } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";

const LIMITE_IMAGEN_MB = 5;

export function OfertasPage() {
  const queryClient = useQueryClient();
  const { add } = useToast();
  const { confirm, confirmModalProps } = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingOferta, setEditingOferta] = useState<Oferta | null>(null);
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [programadaPara, setProgramadaPara] = useState("");
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [eliminarImagen, setEliminarImagen] = useState(false);

  const listQuery = useQuery({
    queryKey: ["ofertas"],
    queryFn: () => ofertasApi.listar({ limit: 50 }),
  });

  const crearMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("titulo", titulo.trim());
      fd.append("mensaje", mensaje.trim());
      if (programadaPara) fd.append("programada_para", programadaPara);
      if (imagenFile) fd.append("imagen", imagenFile);
      return ofertasApi.crear(fd);
    },
    onSuccess: () => {
      add("Oferta creada correctamente.");
      queryClient.invalidateQueries({ queryKey: ["ofertas"] });
      resetForm();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const editarMutation = useMutation({
    mutationFn: (id: number) => {
      const fd = new FormData();
      fd.append("titulo", titulo.trim());
      fd.append("mensaje", mensaje.trim());
      if (programadaPara) fd.append("programada_para", programadaPara);
      if (imagenFile) fd.append("imagen", imagenFile);
      if (eliminarImagen) fd.append("eliminar_imagen", "true");
      return ofertasApi.actualizar(id, fd);
    },
    onSuccess: () => {
      add("Oferta actualizada correctamente.");
      queryClient.invalidateQueries({ queryKey: ["ofertas"] });
      resetForm();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => ofertasApi.eliminar(id),
    onSuccess: () => {
      add("Oferta eliminada.");
      queryClient.invalidateQueries({ queryKey: ["ofertas"] });
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const enviarMutation = useMutation({
    mutationFn: (id: number) => ofertasApi.enviar(id),
    onSuccess: (response) => {
      add(response.data.message);
      queryClient.invalidateQueries({ queryKey: ["ofertas"] });
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  function resetForm() {
    setTitulo("");
    setMensaje("");
    setProgramadaPara("");
    setImagenFile(null);
    setImagenPreview(null);
    setEliminarImagen(false);
    setEditingOferta(null);
    setShowForm(false);
  }

  function handleEditar(oferta: Oferta) {
    setEditingOferta(oferta);
    setTitulo(oferta.titulo);
    setMensaje(oferta.mensaje);
    setProgramadaPara(
      oferta.programada_para
        ? oferta.programada_para.slice(0, 16).replace(" ", "T")
        : ""
    );
    setImagenFile(null);
    setImagenPreview(oferta.imagen_url);
    setEliminarImagen(false);
    setShowForm(true);
  }

  function handleImagenChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > LIMITE_IMAGEN_MB * 1024 * 1024) {
      add(`La imagen no puede superar ${LIMITE_IMAGEN_MB} MB.`, "error");
      return;
    }

    setImagenFile(file);
    setEliminarImagen(false);
    const reader = new FileReader();
    reader.onload = (e) => setImagenPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleQuitarImagen() {
    setImagenFile(null);
    setImagenPreview(null);
    setEliminarImagen(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmitForm() {
    if (editingOferta) {
      editarMutation.mutate(editingOferta.id);
    } else {
      crearMutation.mutate();
    }
  }

  async function handleEliminar(oferta: Oferta) {
    const ok = await confirm({
      title: "Eliminar oferta",
      description: `¿Querés eliminar "${oferta.titulo}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      variant: "danger",
    });
    if (ok) eliminarMutation.mutate(oferta.id);
  }

  async function handleEnviar(oferta: Oferta) {
    const ok = await confirm({
      title: "Enviar oferta ahora",
      description: `Vas a enviar "${oferta.titulo}" a todos los clientes con teléfono registrado. ¿Confirmás?`,
      confirmLabel: "Enviar",
    });
    if (ok) enviarMutation.mutate(oferta.id);
  }

  const isPending = editingOferta ? editarMutation.isPending : crearMutation.isPending;
  const ofertas = listQuery.data?.data.data.rows ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Ofertas y promociones</h1>
          <p className="mt-1 text-sm text-text-muted">
            Creá ofertas con imagen y texto, y enviálas por WhatsApp a todos tus clientes.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> Nueva oferta
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-text">
              {editingOferta ? "Editar oferta" : "Nueva oferta"}
            </h2>
            <button onClick={resetForm} className="text-text-muted transition hover:text-text">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Título de la oferta</label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: 50% de descuento en balanceo este mes"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Mensaje que recibirán los clientes</label>
              <textarea
                rows={4}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Escribí el texto que llegará por WhatsApp a cada cliente..."
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              />
              <p className="mt-1 text-xs text-text-muted">
                Este mensaje se enviará a todos los clientes con teléfono registrado.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">
                Imagen de la oferta <span className="text-text-muted">(opcional, máx. {LIMITE_IMAGEN_MB} MB)</span>
              </label>

              {imagenPreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagenPreview}
                    alt="Vista previa"
                    className="h-40 w-auto rounded-xl border border-border object-cover"
                  />
                  <button
                    onClick={handleQuitarImagen}
                    className="absolute -right-2 -top-2 rounded-full bg-surface-3 p-1 text-text-muted transition hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-28 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm text-text-muted transition hover:border-primary hover:text-primary"
                >
                  <ImagePlus size={20} />
                  Hacé clic para subir una imagen
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImagenChange}
                className="hidden"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">
                Programar envío <span className="text-text-muted">(opcional — si no lo completás la oferta se guarda para enviar cuando quieras)</span>
              </label>
              <input
                type="datetime-local"
                value={programadaPara}
                onChange={(e) => setProgramadaPara(e.target.value)}
                className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={resetForm}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitForm}
                loading={isPending}
                disabled={!titulo.trim() || !mensaje.trim()}
              >
                {editingOferta ? "Guardar cambios" : "Guardar oferta"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card padding={false}>
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-text">Ofertas guardadas</h2>
          <p className="mt-1 text-sm text-text-muted">
            Las ofertas pendientes pueden enviarse manualmente cuando quieras.
          </p>
        </div>

        {listQuery.isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={3} />
          </div>
        ) : ofertas.length ? (
          <div className="divide-y divide-border">
            {ofertas.map((oferta) => (
              <OfertaRow
                key={oferta.id}
                oferta={oferta}
                onEditar={handleEditar}
                onEnviar={handleEnviar}
                onEliminar={handleEliminar}
                enviando={enviarMutation.isPending && enviarMutation.variables === oferta.id}
                eliminando={eliminarMutation.isPending && eliminarMutation.variables === oferta.id}
              />
            ))}
          </div>
        ) : (
          <div className="p-5">
            <EmptyState
              title="No hay ofertas creadas"
              description="Creá tu primera oferta y enviásela a todos tus clientes por WhatsApp."
              icon={Megaphone}
            />
          </div>
        )}
      </Card>

      <ConfirmModal {...confirmModalProps} />
    </div>
  );
}

function OfertaRow({
  oferta,
  onEditar,
  onEnviar,
  onEliminar,
  enviando,
  eliminando,
}: {
  oferta: Oferta;
  onEditar: (o: Oferta) => void;
  onEnviar: (o: Oferta) => void;
  onEliminar: (o: Oferta) => void;
  enviando: boolean;
  eliminando: boolean;
}) {
  const yaEnviada = Boolean(oferta.enviada_at);

  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-4">
        {oferta.imagen_url ? (
          <img
            src={oferta.imagen_url}
            alt={oferta.titulo}
            className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-3 text-text-muted">
            <Megaphone size={22} />
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate font-medium text-text">{oferta.titulo}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-text-muted">{oferta.mensaje}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-text-muted">
            {yaEnviada ? (
              <Badge variant="green">Enviada a {oferta.total_enviados} clientes</Badge>
            ) : oferta.programada_para ? (
              <Badge variant="yellow">Programada: {formatDateTime(oferta.programada_para)}</Badge>
            ) : (
              <Badge variant="gray">Pendiente</Badge>
            )}
            <span>Creada el {formatDateTime(oferta.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        {!yaEnviada && (
          <Button size="sm" onClick={() => onEnviar(oferta)} loading={enviando}>
            <Send size={14} /> Enviar ahora
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => onEditar(oferta)}>
          <Pencil size={14} />
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => onEliminar(oferta)}
          loading={eliminando}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}
