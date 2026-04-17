import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Minus, Package, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { ordenesApi } from "../../features/ordenes/api";
import { productosApi, type Producto } from "../../features/productos/api";
import { useDebounce } from "../../shared/hooks/useDebounce";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "catalogo" | "nuevo";

interface CartItem {
  key: string;
  nombre: string;
  producto_id?: number;
  nombre_nuevo?: string;
  cantidad: number;
  precio: number;
  stock_max: number; // Infinity para ítems nuevos
}

interface AgregarProductoModalProps {
  open: boolean;
  ordenId: number;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Stock badge ──────────────────────────────────────────────────────────────

function StockBadge({ producto }: { producto: Producto }) {
  const stock = Number(producto.stock_actual);
  const minimo = Number(producto.stock_minimo);

  if (stock === 0) {
    return (
      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-300">
        Sin stock
      </span>
    );
  }
  if (stock <= minimo) {
    return (
      <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-medium text-yellow-300">
        Stock bajo · {stock.toLocaleString("es-AR")} {producto.unidad}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-300">
      {stock.toLocaleString("es-AR")} {producto.unidad}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgregarProductoModal({ open, ordenId, onClose, onSuccess }: AgregarProductoModalProps) {
  const { add } = useToast();
  const [tab, setTab] = useState<Tab>("catalogo");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const debouncedSearch = useDebounce(search, 250);

  // Formulario "Nuevo producto"
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [nuevoCantidad, setNuevoCantidad] = useState("1");

  const productosQuery = useQuery({
    queryKey: ["productos-select", debouncedSearch],
    queryFn: () => productosApi.listar({ page: 1, limit: 60, q: debouncedSearch || undefined }),
    enabled: open && tab === "catalogo",
    staleTime: 1000 * 30,
  });

  const productos = productosQuery.data?.data.data.rows ?? [];

  useEffect(() => {
    if (!open) return;
    setTab("catalogo");
    setSearch("");
    setCart([]);
    setNuevoNombre("");
    setNuevoPrecio("");
    setNuevoCantidad("1");
  }, [open]);

  // ── Cart helpers ──────────────────────────────────────────────────────────

  const cartByKey = (key: string) => cart.find((c) => c.key === key) ?? null;
  const cartByProductoId = (id: number) => cart.find((c) => c.producto_id === id) ?? null;

  const addCatalogToCart = (producto: Producto) => {
    if (Number(producto.stock_actual) === 0) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.producto_id === producto.id);
      if (existing) {
        return prev.map((c) =>
          c.producto_id === producto.id
            ? { ...c, cantidad: Math.min(c.cantidad + 1, c.stock_max) }
            : c
        );
      }
      return [
        ...prev,
        {
          key: String(producto.id),
          nombre: producto.nombre,
          producto_id: producto.id,
          cantidad: 1,
          precio: Number(producto.precio_venta),
          stock_max: Number(producto.stock_actual),
        },
      ];
    });
  };

  const addNuevoToCart = () => {
    const nombre = nuevoNombre.trim();
    const precio = parseFloat(nuevoPrecio);
    const cantidad = parseFloat(nuevoCantidad);
    if (!nombre || isNaN(precio) || precio < 0 || isNaN(cantidad) || cantidad <= 0) return;

    setCart((prev) => [
      ...prev,
      {
        key: `nuevo-${Date.now()}`,
        nombre,
        nombre_nuevo: nombre,
        cantidad,
        precio,
        stock_max: Infinity,
      },
    ]);
    setNuevoNombre("");
    setNuevoPrecio("");
    setNuevoCantidad("1");
    setTab("catalogo");
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => prev.filter((c) => c.key !== key));
  };

  const updateCantidad = (key: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return;
    setCart((prev) =>
      prev.map((c) => (c.key !== key ? c : { ...c, cantidad: Math.min(num, c.stock_max) }))
    );
  };

  const updatePrecio = (key: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setCart((prev) => prev.map((c) => (c.key !== key ? c : { ...c, precio: num })));
  };

  // ── Mutation ──────────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: () =>
      ordenesApi.agregarProductosBatch(
        ordenId,
        cart.map((c) =>
          c.producto_id !== undefined
            ? { producto_id: c.producto_id, cantidad: c.cantidad, precio_unitario: c.precio }
            : { nombre_nuevo: c.nombre_nuevo!, cantidad: c.cantidad, precio_unitario: c.precio }
        )
      ),
    onSuccess: () => {
      const n = cart.length;
      add(`${n} ${n === 1 ? "producto agregado" : "productos agregados"}.`);
      onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const cartTotal = cart.reduce((sum, c) => sum + c.cantidad * c.precio, 0);
  const cartCount = cart.length;
  const canAgregarNuevo =
    nuevoNombre.trim().length > 0 &&
    nuevoPrecio !== "" &&
    parseFloat(nuevoPrecio) >= 0 &&
    parseFloat(nuevoCantidad) > 0;

  return (
    <Modal open={open} onClose={onClose} title="Agregar productos" size="xl">
      <div className="flex flex-col gap-4">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
          <button
            type="button"
            onClick={() => setTab("catalogo")}
            className={clsx(
              "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition",
              tab === "catalogo" ? "bg-surface-3 text-text shadow-sm" : "text-text-muted hover:text-text"
            )}
          >
            Buscar en catálogo
          </button>
          <button
            type="button"
            onClick={() => setTab("nuevo")}
            className={clsx(
              "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition",
              tab === "nuevo" ? "bg-surface-3 text-text shadow-sm" : "text-text-muted hover:text-text"
            )}
          >
            Producto personalizado
          </button>
        </div>

        {tab === "catalogo" ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, código o marca..."
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-surface-3 py-2.5 pl-9 pr-3 text-sm text-text outline-none transition focus:border-primary"
              />
            </div>

            {/* Product list */}
            <div className="max-h-56 overflow-y-auto rounded-xl border border-border">
              {productosQuery.isLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-text-muted">
                  Cargando productos...
                </div>
              ) : productos.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-sm text-text-muted">
                  <Package size={20} className="opacity-40" />
                  {debouncedSearch
                    ? `Sin resultados para "${debouncedSearch}"`
                    : "No hay productos disponibles"}
                  <button
                    type="button"
                    onClick={() => {
                      setNuevoNombre(debouncedSearch);
                      setTab("nuevo");
                    }}
                    className="mt-1 text-xs text-primary underline-offset-2 hover:underline"
                  >
                    Crear producto personalizado
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {productos.map((producto) => {
                    const inCart = cartByProductoId(producto.id);
                    const sinStock = Number(producto.stock_actual) === 0;

                    return (
                      <div
                        key={producto.id}
                        className={clsx(
                          "flex items-center gap-3 px-4 py-3 transition",
                          sinStock ? "opacity-50" : "hover:bg-surface-2"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text">{producto.nombre}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            {producto.codigo ? (
                              <span className="font-mono text-xs text-text-muted">{producto.codigo}</span>
                            ) : null}
                            <StockBadge producto={producto} />
                          </div>
                        </div>

                        <span className="shrink-0 text-sm font-semibold text-text">
                          {formatMoney(producto.precio_venta)}
                        </span>

                        {inCart ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                inCart.cantidad <= 1
                                  ? removeFromCart(inCart.key)
                                  : updateCantidad(inCart.key, String(inCart.cantidad - 1))
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-muted transition hover:border-primary hover:text-primary"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold text-primary">
                              {inCart.cantidad}
                            </span>
                            <button
                              type="button"
                              disabled={inCart.cantidad >= inCart.stock_max}
                              onClick={() => addCatalogToCart(producto)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-muted transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={sinStock}
                            onClick={() => addCatalogToCart(producto)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-text-muted transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-text-muted">
              El producto se guardará en el catálogo como &ldquo;General&rdquo; y quedará disponible para futuras órdenes.
            </div>

            <Input
              label="Nombre del producto *"
              autoComplete="off"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Precio de venta *"
                type="number"
                min="0"
                step="0.01"
                value={nuevoPrecio}
                onChange={(e) => setNuevoPrecio(e.target.value)}
              />
              <Input
                label="Cantidad"
                type="number"
                min="0.01"
                step="0.01"
                value={nuevoCantidad}
                onChange={(e) => setNuevoCantidad(e.target.value)}
              />
            </div>

            <Button
              onClick={addNuevoToCart}
              disabled={!canAgregarNuevo}
              className="w-full"
            >
              <Plus size={15} />
              Agregar al carrito
            </Button>
          </>
        )}

        {/* Cart — siempre visible */}
        {cartCount > 0 ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 border-b border-primary/10 px-4 py-2.5">
              <ShoppingCart size={14} className="text-primary" />
              <span className="text-sm font-semibold text-primary">
                Carrito · {cartCount} {cartCount === 1 ? "ítem" : "ítems"}
              </span>
            </div>

            <div className="divide-y divide-primary/10">
              {cart.map((item) => (
                <div key={item.key} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{item.nombre}</p>
                    {item.nombre_nuevo ? (
                      <span className="text-xs font-medium text-primary">Nuevo producto</span>
                    ) : null}
                  </div>

                  {/* Quantity */}
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        item.cantidad <= 1
                          ? removeFromCart(item.key)
                          : updateCantidad(item.key, String(item.cantidad - 1))
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-lg border border-border text-text-muted transition hover:text-primary"
                    >
                      <Minus size={11} />
                    </button>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.cantidad}
                      onChange={(e) => updateCantidad(item.key, e.target.value)}
                      className="w-12 rounded-lg border border-border bg-surface-3 px-1.5 py-0.5 text-center text-sm text-text outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      disabled={item.cantidad >= item.stock_max}
                      onClick={() => {
                        if (item.producto_id !== undefined) {
                          const p = productos.find((x) => x.id === item.producto_id);
                          if (p) addCatalogToCart(p);
                        }
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-lg border border-border text-text-muted transition hover:text-primary disabled:opacity-30"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Price */}
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-xs text-text-muted">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.precio}
                      onChange={(e) => updatePrecio(item.key, e.target.value)}
                      className="w-20 rounded-lg border border-border bg-surface-3 px-1.5 py-0.5 text-right text-sm text-text outline-none focus:border-primary"
                    />
                  </div>

                  {/* Subtotal */}
                  <span className="w-20 shrink-0 text-right text-sm font-semibold text-text">
                    {formatMoney(item.cantidad * item.precio)}
                  </span>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.key)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-text-muted transition hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-primary/10 px-4 py-2.5">
              <span className="text-sm text-text-muted">Total estimado</span>
              <span className="text-base font-bold text-text">{formatMoney(cartTotal)}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-text-muted">
            Usá el <strong className="text-text">+</strong> o creá un producto personalizado para armar el carrito
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={cartCount === 0}
          >
            <ShoppingCart size={15} />
            {cartCount === 0
              ? "Agregar productos"
              : `Confirmar ${cartCount} ${cartCount === 1 ? "producto" : "productos"}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
