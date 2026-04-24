import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ScanBarcode } from "lucide-react";
import { z } from "zod";
import { categoriasApi } from "../../features/categorias/api";
import { productosApi, type Producto } from "../../features/productos/api";
import { proveedoresApi } from "../../features/proveedores/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { formatDateTime } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";

const schema = z.object({
  categoria_id: z.string().min(1, "Selecciona una categoría"),
  proveedor_id: z.string().optional(),
  nombre: z.string().min(1, "El nombre es obligatorio"),
  codigo: z.string().optional(),
  marca: z.string().optional(),
  descripcion: z.string().optional(),
  precio_costo: z.string().min(1, "El costo es obligatorio"),
  precio_venta: z.string().min(1, "El precio de venta es obligatorio"),
  stock_actual: z.string().min(1, "El stock inicial es obligatorio"),
  stock_minimo: z.string().min(1, "El stock mínimo es obligatorio"),
  unidad: z.string().min(1, "La unidad es obligatoria"),
});

type FormData = z.infer<typeof schema>;

interface ProductoModalProps {
  open: boolean;
  onClose: () => void;
  editing: Producto | null;
  onSuccess: () => void;
}

export function ProductoModal({ open, onClose, editing, onSuccess }: ProductoModalProps) {
  const { add } = useToast();
  const isEditing = Boolean(editing);

  const categoriasQuery = useQuery({
    queryKey: ["categorias-producto"],
    queryFn: () => categoriasApi.listar("producto"),
    staleTime: 5 * 60_000,
  });

  const proveedoresQuery = useQuery({
    queryKey: ["proveedores-select"],
    queryFn: () => proveedoresApi.listar({ page: 1, limit: 100 }),
    staleTime: 5 * 60_000,
  });

  const detalleQuery = useQuery({
    queryKey: ["producto-detalle", editing?.id],
    queryFn: () => productosApi.obtener(editing!.id),
    enabled: open && isEditing,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setFocus,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const codigoFieldRef = useRef<HTMLInputElement | null>(null);
  const formResetKeyRef = useRef<string | null>(null);
  const codigoRegister = register("codigo");
  const nombreRegister = register("nombre");

  const resetWithProducto = (producto: Producto) => {
    reset({
      categoria_id: String(producto.categoria_id),
      proveedor_id: producto.proveedor_id ? String(producto.proveedor_id) : "",
      nombre: producto.nombre,
      codigo: producto.codigo || "",
      marca: producto.marca || "",
      descripcion: producto.descripcion || "",
      precio_costo: String(producto.precio_costo ?? 0),
      precio_venta: String(producto.precio_venta ?? 0),
      stock_actual: String(producto.stock_actual ?? 0),
      stock_minimo: String(producto.stock_minimo ?? 0),
      unidad: producto.unidad || "unidad",
    });
  };

  useEffect(() => {
    if (!open) {
      formResetKeyRef.current = null;
      return;
    }

    const resetKey = editing ? `edit-${editing.id}` : "new";
    const detalle = detalleQuery.data?.data.data;

    if (editing) {
      if (formResetKeyRef.current !== resetKey) {
        resetWithProducto(detalle || editing);
        formResetKeyRef.current = resetKey;
        return;
      }

      if (detalle && !isDirty) {
        resetWithProducto(detalle);
      }
      return;
    }

    if (formResetKeyRef.current !== resetKey) {
      reset({
        categoria_id: "",
        proveedor_id: "",
        nombre: "",
        codigo: "",
        marca: "",
        descripcion: "",
        precio_costo: "0",
        precio_venta: "0",
        stock_actual: "0",
        stock_minimo: "0",
        unidad: "unidad",
      });
      formResetKeyRef.current = resetKey;
    }
  }, [editing, reset, open, detalleQuery.data, isDirty]);

  // Auto-focus the barcode field on open (new product) so the scanner lands on it.
  useEffect(() => {
    if (!open || editing) return;
    const timer = setTimeout(() => codigoFieldRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [open, editing]);

  // Global barcode-scanner detection: if a fast keystroke burst lands anywhere
  // in the modal, we still capture it into the codigo field. This protects the
  // flow when focus has drifted to a different field.
  useEffect(() => {
    if (!open) return;

    const FAST_KEY_MAX_MS = 40;
    const MIN_BARCODE_LENGTH = 4;
    let buffer = "";
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const delta = now - lastKeyTime;

      if (e.key === "Enter") {
        if (buffer.length >= MIN_BARCODE_LENGTH) {
          e.preventDefault();
          e.stopPropagation();
          const scanned = buffer;
          setValue("codigo", scanned, { shouldDirty: true, shouldValidate: false });
          // Limpiar el campo donde cayeron los caracteres si no es codigo.
          const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
          if (target && "value" in target && codigoFieldRef.current && target !== codigoFieldRef.current) {
            const currentValue = String(target.value || "");
            if (currentValue.endsWith(scanned)) {
              const cleaned = currentValue.slice(0, currentValue.length - scanned.length);
              const setter = Object.getOwnPropertyDescriptor(
                target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
                "value"
              )?.set;
              setter?.call(target, cleaned);
              target.dispatchEvent(new Event("input", { bubbles: true }));
            }
          }
          try { codigoFieldRef.current?.focus(); } catch { /* noop */ }
        }
        buffer = "";
        lastKeyTime = 0;
        return;
      }

      if (e.key.length !== 1) {
        buffer = "";
        lastKeyTime = 0;
        return;
      }

      if (delta > FAST_KEY_MAX_MS && buffer.length > 0) {
        buffer = "";
      }
      buffer += e.key;
      lastKeyTime = now;
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, setValue]);

  const mutation = useMutation({
    mutationFn: (values: FormData) => {
      const payload = {
        categoria_id: Number(values.categoria_id),
        proveedor_id: values.proveedor_id ? Number(values.proveedor_id) : null,
        nombre: values.nombre,
        codigo: values.codigo || null,
        marca: values.marca || null,
        descripcion: values.descripcion || null,
        precio_costo: Number(values.precio_costo),
        precio_venta: Number(values.precio_venta),
        stock_actual: Number(values.stock_actual),
        stock_minimo: Number(values.stock_minimo),
        unidad: values.unidad,
      };

      return isEditing ? productosApi.actualizar(editing!.id, payload) : productosApi.crear(payload);
    },
    onSuccess: () => {
      add(isEditing ? "Producto actualizado." : "Producto creado.");
      onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const categorias = categoriasQuery.data?.data.data ?? [];
  const proveedores = proveedoresQuery.data?.data.data.rows ?? [];
  const movimientos = detalleQuery.data?.data.data.movimientos ?? [];

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar producto" : "Nuevo producto"} size="xl">
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-5">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-text">
            <ScanBarcode size={18} className="text-primary" />
            Código de barras
          </label>
          <p className="mt-0.5 text-xs text-text-muted">
            Escaneá con el lector o ingresá el código manualmente. Presioná Enter para avanzar al siguiente campo.
          </p>
          <input
            placeholder="0000000000000"
            autoComplete="off"
            className="mt-2 w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            {...codigoRegister}
            ref={(el) => {
              codigoRegister.ref(el);
              codigoFieldRef.current = el;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setFocus("nombre");
              }
            }}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Categoría</label>
            <select
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary disabled:opacity-60"
              disabled={categoriasQuery.isLoading}
              {...register("categoria_id")}
            >
              <option value="">{categoriasQuery.isLoading ? "Cargando categorías..." : "Seleccionar categoría"}</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={String(categoria.id)}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
            {errors.categoria_id ? <span className="text-xs text-red-300">{errors.categoria_id.message}</span> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Proveedor</label>
            <select
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary disabled:opacity-60"
              disabled={proveedoresQuery.isLoading}
              {...register("proveedor_id")}
            >
              <option value="">{proveedoresQuery.isLoading ? "Cargando proveedores..." : "Sin proveedor asignado"}</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={String(proveedor.id)}>
                  {proveedor.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Nombre" error={errors.nombre?.message} {...nombreRegister} />
          <Input label="Marca" {...register("marca")} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Precio costo"
            type="number"
            min="0"
            step="0.01"
            error={errors.precio_costo?.message}
            {...register("precio_costo")}
          />
          <Input
            label="Precio venta"
            type="number"
            min="0"
            step="0.01"
            error={errors.precio_venta?.message}
            {...register("precio_venta")}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Input
            label="Stock actual"
            type="number"
            min="0"
            step="0.01"
            error={errors.stock_actual?.message}
            {...register("stock_actual")}
          />
          <Input
            label="Stock mínimo"
            type="number"
            min="0"
            step="0.01"
            error={errors.stock_minimo?.message}
            {...register("stock_minimo")}
          />
          <Input label="Unidad" error={errors.unidad?.message} {...register("unidad")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Descripción</label>
          <textarea
            rows={4}
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            placeholder="Compatibilidades, ubicación en depósito o notas útiles."
            {...register("descripcion")}
          />
        </div>

        {isEditing ? (
          <div className="rounded-2xl border border-border bg-surface-2 p-4">
            <h3 className="font-semibold text-text">Movimientos recientes de stock</h3>
            <p className="mt-1 text-sm text-text-muted">Últimos cambios registrados para este producto.</p>

            {detalleQuery.isLoading ? (
              <div className="mt-4 text-sm text-text-muted">Cargando historial de stock...</div>
            ) : movimientos.length ? (
              <div className="mt-4 space-y-2">
                {movimientos.map((movimiento) => (
                  <div
                    key={movimiento.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium capitalize text-text">{movimiento.tipo}</p>
                      <p className="text-xs text-text-muted">
                        {movimiento.notas || "Sin observaciones"} · {formatDateTime(movimiento.created_at)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-text-muted">
                      <p>{Number(movimiento.cantidad).toLocaleString("es-AR")} unidad(es)</p>
                      <p>
                        {Number(movimiento.stock_anterior).toLocaleString("es-AR")} →{" "}
                        {Number(movimiento.stock_nuevo).toLocaleString("es-AR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-text-muted">Todavía no hay movimientos registrados.</p>
            )}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEditing ? "Guardar cambios" : "Crear producto"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
