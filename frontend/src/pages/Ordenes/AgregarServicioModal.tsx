import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus, Search } from "lucide-react";
import { ordenesApi } from "../../features/ordenes/api";
import { serviciosApi } from "../../features/servicios/api";
import { useDebounce } from "../../shared/hooks/useDebounce";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";

type Tab = "catalogo" | "nuevo";

interface AgregarServicioModalProps {
  open: boolean;
  ordenId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function AgregarServicioModal({ open, ordenId, onClose, onSuccess }: AgregarServicioModalProps) {
  const { add } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("catalogo");

  // Tab: catálogo
  const [search, setSearch] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [precio, setPrecio] = useState("0");
  const [descripcion, setDescripcion] = useState("");
  const debouncedSearch = useDebounce(search, 250);

  // Tab: nuevo servicio
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [precioNuevo, setPrecioNuevo] = useState("");
  const [cantidadNuevo, setCantidadNuevo] = useState("1");
  const [descripcionNueva, setDescripcionNueva] = useState("");

  const serviciosQuery = useQuery({
    queryKey: ["servicios-select", debouncedSearch],
    queryFn: () => serviciosApi.listar({ page: 1, limit: 50, q: debouncedSearch || undefined }),
    enabled: open && tab === "catalogo",
  });

  const servicios = serviciosQuery.data?.data.data.rows ?? [];
  const servicioSeleccionado = servicios.find((item) => item.id === Number(servicioId)) || null;
  const sinResultados = !serviciosQuery.isLoading && debouncedSearch.length > 0 && servicios.length === 0;

  useEffect(() => {
    if (!open) return;
    setTab("catalogo");
    setSearch("");
    setServicioId("");
    setCantidad("1");
    setPrecio("0");
    setDescripcion("");
    setNombreNuevo("");
    setPrecioNuevo("");
    setCantidadNuevo("1");
    setDescripcionNueva("");
  }, [open]);

  useEffect(() => {
    if (!servicioSeleccionado) return;
    setPrecio(String(servicioSeleccionado.precio_base));
    setDescripcion(servicioSeleccionado.nombre);
  }, [servicioSeleccionado]);

  const mutation = useMutation({
    mutationFn: () => {
      if (tab === "catalogo") {
        return ordenesApi.agregarServicio(ordenId, {
          servicio_id: Number(servicioId),
          cantidad: Number(cantidad),
          precio_unitario: Number(precio),
          descripcion: descripcion || null,
        });
      }
      return ordenesApi.agregarServicio(ordenId, {
        nombre_nuevo: nombreNuevo.trim(),
        cantidad: Number(cantidadNuevo),
        precio_unitario: Number(precioNuevo),
        descripcion: descripcionNueva || null,
      });
    },
    onSuccess: ({ data: response }) => {
      add("Servicio agregado.");
      if (response.servicio_creado) {
        queryClient.invalidateQueries({ queryKey: ["servicios"] });
        queryClient.invalidateQueries({ queryKey: ["servicios-select"] });
      }
      onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const switchToNuevo = (prefill = "") => {
    setNombreNuevo(prefill);
    setPrecioNuevo("");
    setCantidadNuevo("1");
    setDescripcionNueva("");
    setTab("nuevo");
  };

  const subtotalCatalogo = Number(cantidad || 0) * Number(precio || 0);
  const subtotalNuevo = Number(cantidadNuevo || 0) * Number(precioNuevo || 0);

  const canSubmitCatalogo = Boolean(servicioId);
  const canSubmitNuevo = nombreNuevo.trim().length > 0 && Number(precioNuevo) >= 0 && precioNuevo !== "";

  return (
    <Modal open={open} onClose={onClose} title="Agregar servicio" size="lg">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
          <button
            type="button"
            onClick={() => setTab("catalogo")}
            className={clsx(
              "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition",
              tab === "catalogo"
                ? "bg-surface-3 text-text shadow-sm"
                : "text-text-muted hover:text-text"
            )}
          >
            Buscar en catálogo
          </button>
          <button
            type="button"
            onClick={() => switchToNuevo()}
            className={clsx(
              "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition",
              tab === "nuevo"
                ? "bg-surface-3 text-text shadow-sm"
                : "text-text-muted hover:text-text"
            )}
          >
            Servicio personalizado
          </button>
        </div>

        {tab === "catalogo" ? (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar servicio por nombre..."
                className="w-full rounded-xl border border-border bg-surface-3 px-10 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              />
            </div>

            {sinResultados ? (
              <button
                type="button"
                onClick={() => switchToNuevo(search)}
                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-2.5 text-sm text-primary transition hover:bg-primary/10"
              >
                <Plus size={15} />
                Crear servicio &ldquo;{search}&rdquo;
              </button>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-muted">Servicio</label>
                <select
                  value={servicioId}
                  onChange={(event) => setServicioId(event.target.value)}
                  className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
                >
                  <option value="">{serviciosQuery.isLoading ? "Cargando servicios..." : "Seleccionar servicio"}</option>
                  {servicios.map((servicio) => (
                    <option key={servicio.id} value={servicio.id}>
                      {servicio.nombre} · {formatMoney(servicio.precio_base)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!sinResultados && (
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Cantidad" type="number" min="1" value={cantidad} onChange={(event) => setCantidad(event.target.value)} />
                <Input
                  label="Precio aplicado"
                  type="number"
                  min="0"
                  step="0.01"
                  value={precio}
                  onChange={(event) => setPrecio(event.target.value)}
                />
              </div>
            )}

            {!sinResultados && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-muted">Descripción en orden</label>
                <textarea
                  rows={2}
                  value={descripcion}
                  onChange={(event) => setDescripcion(event.target.value)}
                  className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
                />
              </div>
            )}

            {!sinResultados && (
              <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-muted">
                Subtotal estimado:{" "}
                <span className="font-semibold text-text">{formatMoney(subtotalCatalogo)}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-text-muted">
              El servicio se guardará en el catálogo como &ldquo;General&rdquo; para poder reutilizarlo en futuras órdenes.
            </div>

            <Input
              label="Nombre del servicio *"
              autoComplete="off"
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Precio *"
                type="number"
                min="0"
                step="0.01"
                value={precioNuevo}
                onChange={(e) => setPrecioNuevo(e.target.value)}
              />
              <Input
                label="Cantidad"
                type="number"
                min="1"
                value={cantidadNuevo}
                onChange={(e) => setCantidadNuevo(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-muted">Descripción en orden</label>
              <textarea
                rows={2}
                value={descripcionNueva}
                onChange={(event) => setDescripcionNueva(event.target.value)}
                className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              />
            </div>

            <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-muted">
              Subtotal estimado:{" "}
              <span className="font-semibold text-text">{formatMoney(subtotalNuevo)}</span>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={tab === "catalogo" ? !canSubmitCatalogo : !canSubmitNuevo}
          >
            Agregar servicio
          </Button>
        </div>
      </div>
    </Modal>
  );
}
