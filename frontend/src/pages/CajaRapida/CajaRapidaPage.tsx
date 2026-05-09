import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CreditCard,
  Minus,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import {
  ventasRapidasApi,
  type CreateVentaRapidaPayload,
  type MedioPago,
  type VentaRapida,
} from "../../features/ventas-rapidas/api";
import { productosApi } from "../../features/productos/api";
import { useDebounce } from "../../shared/hooks/useDebounce";
import { Button } from "../../shared/ui/Button";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { formatMoney } from "../../shared/utils/format";
import { openPdfForPrint } from "../../shared/utils/printPdf";

interface ItemCarrito {
  producto_id: number | null;
  producto_nombre: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
}

const MEDIOS_PAGO: { value: MedioPago; label: string; icon: React.ReactNode }[] = [
  { value: "efectivo",      label: "Efectivo",      icon: <Banknote size={18} /> },
  { value: "tarjeta",       label: "Tarjeta",       icon: <CreditCard size={18} /> },
  { value: "transferencia", label: "Transferencia", icon: <Wifi size={18} /> },
];

export function CajaRapidaPage() {
  const { add } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [medioPago, setMedioPago] = useState<MedioPago>("efectivo");
  const [notas, setNotas] = useState("");
  const [ventaOk, setVentaOk] = useState(false);
  const [ultimaVenta, setUltimaVenta] = useState<VentaRapida | null>(null);

  const debouncedSearch = useDebounce(search, 250);

  const saldoQuery = useQuery({
    queryKey: ["caja-saldo-hoy"],
    queryFn: () => ventasRapidasApi.saldoCajaHoy(),
    refetchInterval: 30_000,
  });

  const productosQuery = useQuery({
    queryKey: ["caja-rapida-productos", debouncedSearch],
    queryFn: () => productosApi.listar({ page: 1, limit: 20, q: debouncedSearch || undefined }),
    enabled: debouncedSearch.length > 0,
  });

  const productos = productosQuery.data?.data.data.rows ?? [];

  const agregarProducto = (p: { id: number; nombre: string; unidad?: string; precio_venta?: number | string | null }) => {
    setCarrito((prev) => {
      const existing = prev.find((i) => i.producto_id === p.id);
      if (existing) {
        return prev.map((i) =>
          i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [
        ...prev,
        {
          producto_id: p.id,
          producto_nombre: p.nombre,
          unidad: p.unidad || "unidad",
          cantidad: 1,
          precio_unitario: Number(p.precio_venta) || 0,
        },
      ];
    });
    setSearch("");
  };

  const agregarManual = () => {
    if (!search.trim()) return;
    setCarrito((prev) => [
      ...prev,
      {
        producto_id: null,
        producto_nombre: search.trim(),
        unidad: "unidad",
        cantidad: 1,
        precio_unitario: 0,
      },
    ]);
    setSearch("");
  };

  const actualizar = (idx: number, field: "cantidad" | "precio_unitario", value: number) => {
    if (field === "cantidad" && value <= 0) {
      setCarrito((prev) => prev.filter((_, i) => i !== idx));
      return;
    }
    setCarrito((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const quitar = (idx: number) =>
    setCarrito((prev) => prev.filter((_, i) => i !== idx));

  const total = carrito.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CreateVentaRapidaPayload = {
        fecha: new Date().toISOString().slice(0, 10),
        medio_pago: medioPago,
        notas: notas || null,
        items: carrito.map((i) => ({
          producto_id: i.producto_id || undefined,
          producto_nombre: i.producto_nombre,
          unidad: i.unidad,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
      };
      return ventasRapidasApi.crear(payload);
    },
    onSuccess: (res) => {
      const venta = res.data.data;
      setUltimaVenta(venta);
      setVentaOk(true);
      queryClient.invalidateQueries({ queryKey: ["caja-saldo-hoy"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-resumen"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-por-dia"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-movimientos"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-movimientos-detalle"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-movimientos-mes"] });
      setTimeout(() => {
        setCarrito([]);
        setNotas("");
        setMedioPago("efectivo");
        setVentaOk(false);
      }, 2000);
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const imprimirComprobanteMutation = useMutation({
    mutationFn: (ventaId: number) => ventasRapidasApi.imprimirComprobante(ventaId),
    onSuccess: ({ data }, ventaId) => {
      openPdfForPrint(data, `caja-rapida-${ventaId}.pdf`);
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const canConfirm = carrito.length > 0 && !mutation.isPending;
  const saldoHoy = saldoQuery.data?.data.data.total ?? 0;

  return (
    <div className="flex h-full flex-col gap-5 lg:flex-row">
      {/* ── Panel izquierdo: búsqueda y productos ── */}
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">Caja Rápida</h1>
            <p className="mt-1 text-sm text-text-muted">
              Vendé productos al instante sin necesitar una orden de trabajo.
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-border bg-surface px-4 py-3 text-right">
            <p className="text-xs font-medium uppercase text-text-muted">Efectivo hoy</p>
            <p className="mt-0.5 text-xl font-bold text-text">
              {saldoQuery.isLoading ? "..." : formatMoney(saldoHoy)}
            </p>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto por nombre o código..."
            className="w-full rounded-xl border border-border bg-surface-2 py-3 pl-11 pr-4 text-sm text-text outline-none transition focus:border-primary"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {ultimaVenta && (
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-green-500/25 bg-green-500/10 px-4 py-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-green-200">
                Ultima venta #{ultimaVenta.id} registrada
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {formatMoney(ultimaVenta.total)} - {ultimaVenta.medio_pago}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => imprimirComprobanteMutation.mutate(ultimaVenta.id)}
              loading={imprimirComprobanteMutation.isPending}
            >
              <Printer size={15} /> Imprimir comprobante
            </Button>
          </div>
        )}

        {/* Resultados */}
        {search && (
          <div className="rounded-xl border border-border bg-surface shadow-lg">
            {productosQuery.isLoading && (
              <p className="px-4 py-3 text-sm text-text-muted">Buscando...</p>
            )}
            {!productosQuery.isLoading && productos.length === 0 && (
              <div className="px-4 py-3">
                <p className="text-sm text-text-muted">
                  No encontramos &quot;{search}&quot; en el stock.
                </p>
                <button
                  onClick={agregarManual}
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  + Agregar &quot;{search}&quot; como ítem manual
                </button>
              </div>
            )}
            {productos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => agregarProducto(p)}
                className="flex w-full items-center justify-between border-b border-border/40 px-4 py-3 text-left text-sm transition hover:bg-surface-2 first:rounded-t-xl last:rounded-b-xl last:border-0"
              >
                <div>
                  <span className="font-medium text-text">{p.nombre}</span>
                  {p.codigo && (
                    <span className="ml-2 text-xs text-text-muted">{p.codigo}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span>Stock: {Number(p.stock_actual).toLocaleString("es-AR")}</span>
                  <span className="font-semibold text-text">
                    {formatMoney(Number(p.precio_venta))}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Estado vacío */}
        {carrito.length === 0 && !search && (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-2 py-16 text-center">
            <ShoppingBag size={40} className="mb-3 text-text-muted/40" />
            <p className="text-sm font-medium text-text-muted">
              Buscá un producto para comenzar
            </p>
            <p className="mt-1 text-xs text-text-muted/70">
              También podés ingresar cualquier ítem manualmente
            </p>
          </div>
        )}

        {/* Carrito (en móvil aparece aquí, en desktop en la columna derecha) */}
        {carrito.length > 0 && (
          <div className="lg:hidden">
            <CarritoPanel
              carrito={carrito}
              medioPago={medioPago}
              notas={notas}
              total={total}
              canConfirm={canConfirm}
              ventaOk={ventaOk}
              isPending={mutation.isPending}
              onActualizar={actualizar}
              onQuitar={quitar}
              onMedioPago={setMedioPago}
              onNotas={setNotas}
              onConfirmar={() => mutation.mutate()}
            />
          </div>
        )}
      </div>

      {/* ── Panel derecho: carrito (solo desktop) ── */}
      <div className="hidden w-96 shrink-0 lg:block">
        <CarritoPanel
          carrito={carrito}
          medioPago={medioPago}
          notas={notas}
          total={total}
          canConfirm={canConfirm}
          ventaOk={ventaOk}
          isPending={mutation.isPending}
          onActualizar={actualizar}
          onQuitar={quitar}
          onMedioPago={setMedioPago}
          onNotas={setNotas}
          onConfirmar={() => mutation.mutate()}
        />
      </div>
    </div>
  );
}

// ── Componente del carrito/checkout ─────────────────────────────────────────

interface CarritoPanelProps {
  carrito: ItemCarrito[];
  medioPago: MedioPago;
  notas: string;
  total: number;
  canConfirm: boolean;
  ventaOk: boolean;
  isPending: boolean;
  onActualizar: (idx: number, field: "cantidad" | "precio_unitario", value: number) => void;
  onQuitar: (idx: number) => void;
  onMedioPago: (v: MedioPago) => void;
  onNotas: (v: string) => void;
  onConfirmar: () => void;
}

function CarritoPanel({
  carrito,
  medioPago,
  notas,
  total,
  canConfirm,
  ventaOk,
  isPending,
  onActualizar,
  onQuitar,
  onMedioPago,
  onNotas,
  onConfirmar,
}: CarritoPanelProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-text">
          {carrito.length === 0
            ? "Carrito vacío"
            : `${carrito.length} producto${carrito.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {carrito.length === 0 ? (
          <div className="flex h-full items-center justify-center py-12 text-sm text-text-muted">
            Agregá productos para vender
          </div>
        ) : (
          <div>
            {carrito.map((item, idx) => (
              <div
                key={idx}
                className="border-b border-border/40 px-4 py-3 last:border-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-text leading-tight">{item.producto_nombre}</p>
                  <button
                    onClick={() => onQuitar(idx)}
                    className="shrink-0 text-text-muted hover:text-red-300 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  {/* Cantidad */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onActualizar(idx, "cantidad", item.cantidad - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-3 text-text-muted hover:text-text transition"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-text">
                      {item.cantidad}
                    </span>
                    <button
                      type="button"
                      onClick={() => onActualizar(idx, "cantidad", item.cantidad + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-3 text-text-muted hover:text-text transition"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <span className="text-xs text-text-muted">×</span>

                  {/* Precio */}
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-muted">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.precio_unitario}
                      onChange={(e) => onActualizar(idx, "precio_unitario", Number(e.target.value))}
                      className="w-full rounded-lg border border-border bg-surface-3 py-1.5 pl-5 pr-2 text-right text-sm text-text outline-none focus:border-primary"
                    />
                  </div>

                  <span className="w-20 text-right text-sm font-semibold text-text">
                    {formatMoney(item.cantidad * item.precio_unitario)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Medio de pago + total + confirmar */}
      <div className="border-t border-border p-4 space-y-4">
        {/* Medio de pago */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-text-muted">
            Medio de pago
          </p>
          <div className="grid grid-cols-3 gap-2">
            {MEDIOS_PAGO.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => onMedioPago(m.value)}
                className={[
                  "flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition",
                  medioPago === m.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface-2 text-text-muted hover:border-border-hover hover:text-text",
                ].join(" ")}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notas */}
        <textarea
          rows={2}
          value={notas}
          onChange={(e) => onNotas(e.target.value)}
          placeholder="Notas (opcional)..."
          className="w-full rounded-xl border border-border bg-surface-3 px-3 py-2 text-sm text-text outline-none transition focus:border-primary resize-none"
        />

        {/* Total */}
        <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
          <span className="text-sm font-medium text-text-muted">Total</span>
          <span className="text-2xl font-bold text-text">{formatMoney(total)}</span>
        </div>

        {/* Confirmar */}
        {ventaOk ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-green-500/15 py-4 text-sm font-semibold text-green-300">
            ✓ Venta registrada
          </div>
        ) : (
          <Button
            onClick={onConfirmar}
            disabled={!canConfirm}
            loading={isPending}
            className="w-full justify-center py-4 text-base font-bold"
          >
            Cobrar {canConfirm ? formatMoney(total) : ""}
          </Button>
        )}
      </div>
    </div>
  );
}
