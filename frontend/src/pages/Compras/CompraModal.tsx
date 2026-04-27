import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Minus, PackagePlus, Plus, Search, Trash2 } from "lucide-react";
import { comprasApi, type CreateCompraPayload } from "../../features/compras/api";
import { productosApi } from "../../features/productos/api";
import { proveedoresApi } from "../../features/proveedores/api";
import { useDebounce } from "../../shared/hooks/useDebounce";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { formatMoney, toLocalDateInputValue } from "../../shared/utils/format";

interface ItemLocal {
  producto_id?: number | null;
  producto_nombre: string;
  codigo?: string | null;
  unidad: string;
  descripcion?: string | null;
  cantidad: number;
  precio_unitario: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CompraModal({ open, onClose, onSuccess }: Props) {
  const { add } = useToast();
  const [fecha, setFecha] = useState(toLocalDateInputValue());
  const [origenTipo, setOrigenTipo] = useState<"directa" | "proveedor" | "casa_repuestos">("directa");
  const [proveedorId, setProveedorId] = useState("");
  const [origenNombre, setOrigenNombre] = useState("");
  const [actualizaStock, setActualizaStock] = useState(true);
  const [notas, setNotas] = useState("");
  const [searchProducto, setSearchProducto] = useState("");
  const [items, setItems] = useState<ItemLocal[]>([]);
  const debouncedSearch = useDebounce(searchProducto, 250);

  const proveedoresQuery = useQuery({
    queryKey: ["proveedores-select"],
    queryFn: () => proveedoresApi.listar({ page: 1, limit: 200 }),
    staleTime: 1000 * 60 * 5,
  });

  const productosQuery = useQuery({
    queryKey: ["productos-compra-search", debouncedSearch],
    queryFn: () => productosApi.listar({ page: 1, limit: 30, q: debouncedSearch || undefined }),
    enabled: open,
  });

  const proveedores = proveedoresQuery.data?.data.data.rows ?? [];
  const productosResultado = productosQuery.data?.data.data.rows ?? [];

  const agregarProducto = (p: any) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.producto_id === p.id);
      if (existing) {
        return prev.map((i) =>
          i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...prev, {
        producto_id: p.id,
        producto_nombre: p.nombre,
        codigo: p.codigo,
        unidad: p.unidad || "unidad",
        cantidad: 1,
        precio_unitario: Number(p.precio_costo) || 0,
      }];
    });
    setSearchProducto("");
  };

  const agregarItemLibre = () => {
    const descripcion = searchProducto.trim();
    if (!descripcion) return;

    setItems((prev) => [
      ...prev,
      {
        producto_id: null,
        producto_nombre: descripcion,
        descripcion,
        unidad: "unidad",
        cantidad: 1,
        precio_unitario: 0,
      },
    ]);
    setSearchProducto("");
  };

  const quitarItem = (index: number) =>
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));

  const updateCantidad = (index: number, cantidad: number) => {
    if (cantidad <= 0) return quitarItem(index);
    setItems((prev) => prev.map((i, itemIndex) => itemIndex === index ? { ...i, cantidad } : i));
  };

  const updatePrecio = (index: number, precio: number) =>
    setItems((prev) => prev.map((i, itemIndex) => itemIndex === index ? { ...i, precio_unitario: precio } : i));

  const updateDescripcion = (index: number, descripcion: string) =>
    setItems((prev) =>
      prev.map((i, itemIndex) =>
        itemIndex === index
          ? {
              ...i,
              descripcion,
              producto_nombre: i.producto_id ? i.producto_nombre : descripcion,
            }
          : i
      )
    );

  const total = items.reduce((sum, i) => sum + i.cantidad * i.precio_unitario, 0);
  const itemsValidos = items.every((item) => item.producto_id || item.descripcion?.trim());
  const origenValido =
    origenTipo === "proveedor"
      ? Boolean(proveedorId)
      : origenTipo === "casa_repuestos"
        ? Boolean(origenNombre.trim())
        : true;
  const puedeGuardar =
    items.length > 0 &&
    itemsValidos &&
    origenValido &&
    (!actualizaStock || items.every((item) => item.producto_id));

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CreateCompraPayload = {
        proveedor_id: origenTipo === "proveedor" && proveedorId ? Number(proveedorId) : null,
        origen_tipo: origenTipo,
        origen_nombre: origenTipo === "casa_repuestos" ? origenNombre.trim() || null : null,
        actualiza_stock: actualizaStock,
        fecha,
        notas: notas || null,
        items: items.map((i) => ({
          producto_id:     i.producto_id || null,
          descripcion:     i.descripcion || i.producto_nombre || null,
          cantidad:        i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
      };
      return comprasApi.crear(payload);
    },
    onSuccess: () => {
      add(actualizaStock ? "Compra registrada. El stock fue actualizado." : "Compra registrada sin modificar stock.");
      resetForm();
      onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const resetForm = () => {
    setFecha(toLocalDateInputValue());
    setOrigenTipo("directa");
    setProveedorId("");
    setOrigenNombre("");
    setActualizaStock(true);
    setNotas("");
    setSearchProducto("");
    setItems([]);
  };

  const handleClose = () => { resetForm(); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="Registrar compra" size="xl">
      <div className="space-y-5">
        {/* Datos generales */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Tipo de compra</label>
            <select
              value={origenTipo}
              onChange={(e) => {
                const next = e.target.value as typeof origenTipo;
                setOrigenTipo(next);
                if (next !== "proveedor") setProveedorId("");
                if (next !== "casa_repuestos") setOrigenNombre("");
              }}
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            >
              <option value="directa">Compra directa / libre</option>
              <option value="proveedor">Proveedor registrado</option>
              <option value="casa_repuestos">Casa de repuestos</option>
            </select>
          </div>
          <Input
            label="Fecha de compra"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>

        {origenTipo === "proveedor" ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Proveedor</label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            >
              <option value="">Seleccionar proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
        ) : null}

        {origenTipo === "casa_repuestos" ? (
          <Input
            label="Nombre de la casa de repuestos"
            value={origenNombre}
            onChange={(e) => setOrigenNombre(e.target.value)}
            placeholder="Ej: Repuestos Centro"
          />
        ) : null}

        <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={actualizaStock}
            onChange={(e) => setActualizaStock(e.target.checked)}
            className="mt-1 h-4 w-4 accent-primary"
          />
          <span>
            <span className="block font-medium text-text">Sumar esta compra al stock</span>
            <span className="text-text-muted">
              Desactivalo para registrar compras libres, presupuestos o repuestos que no queres cargar al inventario.
            </span>
          </span>
        </label>

        {/* Buscador de productos */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-muted">
            Agregar productos a la compra
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={searchProducto}
              onChange={(e) => setSearchProducto(e.target.value)}
              placeholder={actualizaStock ? "Buscar producto por nombre o codigo..." : "Buscar producto o escribir descripcion libre..."}
              className="w-full rounded-xl border border-border bg-surface-3 px-10 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            />
          </div>

          {searchProducto && productosResultado.length > 0 && (
            <div className="mt-1 rounded-xl border border-border bg-surface shadow-lg">
              {productosResultado.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => agregarProducto(p)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-surface-2 transition first:rounded-t-xl last:rounded-b-xl border-b border-border/40 last:border-0"
                >
                  <div>
                    <span className="font-medium text-text">{p.nombre}</span>
                    {p.codigo && <span className="ml-2 text-xs text-text-muted">{p.codigo}</span>}
                  </div>
                  <span className="text-xs text-text-muted">
                    Stock actual: {Number(p.stock_actual).toLocaleString("es-AR")} {p.unidad}
                  </span>
                </button>
              ))}
            </div>
          )}

          {searchProducto && !productosQuery.isLoading && productosResultado.length === 0 && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">No se encontraron productos con ese criterio.</p>
              {!actualizaStock ? (
                <Button size="sm" variant="secondary" onClick={agregarItemLibre}>
                  <PackagePlus size={14} /> Agregar libre
                </Button>
              ) : null}
            </div>
          )}

          {searchProducto && !actualizaStock && productosResultado.length > 0 ? (
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="secondary" onClick={agregarItemLibre}>
                <PackagePlus size={14} /> Agregar item libre
              </Button>
            </div>
          ) : null}
        </div>

        {/* Lista de items agregados */}
        {items.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_120px_32px] gap-2 border-b border-border bg-surface-2 px-3 py-2 text-xs uppercase text-text-muted">
              <span>Producto</span>
              <span className="text-center">Cantidad</span>
              <span className="text-right">Precio costo</span>
              <span />
            </div>
            {items.map((item, index) => (
              <div
                key={`${item.producto_id || "libre"}-${index}`}
                className="grid grid-cols-[1fr_100px_120px_32px] items-center gap-2 border-b border-border/40 px-3 py-2.5 last:border-0"
              >
                <div>
                  {item.producto_id ? (
                    <p className="text-sm font-medium text-text">{item.producto_nombre}</p>
                  ) : (
                    <input
                      value={item.descripcion || ""}
                      onChange={(e) => updateDescripcion(index, e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface-3 px-2 py-1 text-sm font-medium text-text outline-none focus:border-primary"
                    />
                  )}
                  <p className="text-xs text-text-muted">
                    Subtotal: {formatMoney(item.cantidad * item.precio_unitario)}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateCantidad(index, item.cantidad - 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface-3 text-text-muted hover:text-text transition"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{item.cantidad}</span>
                  <button
                    type="button"
                    onClick={() => updateCantidad(index, item.cantidad + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface-3 text-text-muted hover:text-text transition"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.precio_unitario}
                  onChange={(e) => updatePrecio(index, Number(e.target.value))}
                  className="rounded-lg border border-border bg-surface-3 px-2 py-1 text-right text-sm text-text outline-none focus:border-primary w-full"
                />
                <button
                  type="button"
                  onClick={() => quitarItem(index)}
                  className="flex h-6 w-6 items-center justify-center text-text-muted hover:text-red-300 transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between bg-surface-2 px-4 py-3">
              <span className="text-sm font-medium text-text-muted">
                {items.length} producto(s)
              </span>
              <span className="text-base font-bold text-text">
                Total: {formatMoney(total)}
              </span>
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-surface-2 py-8 text-center text-sm text-text-muted">
            {actualizaStock
              ? "Busca y agrega productos para sumar stock."
              : "Busca productos o agrega items libres para dejar registrada la compra."}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Notas (opcional)</label>
          <textarea
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Número de factura, observaciones, etc."
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!puedeGuardar}
          >
            {actualizaStock ? "Registrar compra y actualizar stock" : "Registrar compra"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
