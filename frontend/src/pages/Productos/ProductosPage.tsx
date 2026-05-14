import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, Pencil, Plus, Search, Settings2, SlidersHorizontal, Trash2, Upload } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { categoriasApi } from "../../features/categorias/api";
import { productosApi, type Producto } from "../../features/productos/api";
import { useConfirm } from "../../shared/hooks/useConfirm";
import { useDebounce } from "../../shared/hooks/useDebounce";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { EmptyState } from "../../shared/ui/EmptyState";
import { TableSkeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { AjusteStockModal } from "./AjusteStockModal";
import { CategoriasProductoPanel } from "./CategoriasProductoPanel";
import { ProductoModal } from "./ProductoModal";
import { StockBadge } from "./StockBadge";

export function ProductosPage() {
  const queryClient = useQueryClient();
  const { add } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [categoriaId, setCategoriaId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [categoriasOpen, setCategoriasOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [adjusting, setAdjusting] = useState<Producto | null>(null);
  const [soloStockBajo, setSoloStockBajo] = useState(searchParams.get("stock_bajo") === "true");
  const debouncedSearch = useDebounce(search, 300);
  const { confirm, confirmModalProps } = useConfirm();

  useEffect(() => {
    setSoloStockBajo(searchParams.get("stock_bajo") === "true");
  }, [searchParams]);

  const categoriasQuery = useQuery({
    queryKey: ["categorias-producto"],
    queryFn: () => categoriasApi.listar("producto"),
    staleTime: 5 * 60_000,
  });

  const productosQuery = useQuery({
    queryKey: ["productos", page, debouncedSearch, categoriaId, soloStockBajo],
    queryFn: () =>
      productosApi.listar({
        page,
        limit: 12,
        q: debouncedSearch || undefined,
        categoria_id: categoriaId || undefined,
        stock_bajo: soloStockBajo || undefined,
      }),
  });

  const stockBajoQuery = useQuery({
    queryKey: ["productos-stock-bajo"],
    queryFn: () => productosApi.stockBajo(),
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productosApi.eliminar(id),
    onSuccess: () => {
      invalidateProductos();
      add("Producto eliminado.");
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const categorias = categoriasQuery.data?.data.data ?? [];
  const productos = productosQuery.data?.data.data.rows ?? [];
  const total = productosQuery.data?.data.data.total ?? 0;
  const stockBajo = stockBajoQuery.data?.data.data ?? [];

  const invalidateProductos = () => {
    queryClient.invalidateQueries({ queryKey: ["productos"] });
    queryClient.invalidateQueries({ queryKey: ["productos-stock-bajo"] });
    queryClient.invalidateQueries({ queryKey: ["sidebar-stock-bajo"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stock-bajo"] });
  };

  const handleEliminar = async (producto: Producto) => {
    const ok = await confirm({
      title: `¿Eliminar el producto ${producto.nombre}?`,
      description: "Solo debería eliminarse si no tiene movimientos recientes.",
      confirmLabel: "Sí, eliminar",
      variant: "danger",
    });

    if (ok) {
      deleteMutation.mutate(producto.id);
    }
  };

  const updateStockFilter = (value: boolean) => {
    const nextParams = new URLSearchParams(searchParams);

    if (value) {
      nextParams.set("stock_bajo", "true");
    } else {
      nextParams.delete("stock_bajo");
    }

    setPage(1);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text">Productos y stock</h1>
          <p className="mt-1 text-sm text-text-muted">
            Repuestos e insumos con control de mínimo, proveedor y trazabilidad de movimientos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => setCategoriasOpen((v) => !v)}
          >
            <Settings2 size={15} /> Categorías
          </Button>
          <DescargarPlantillaButton />
          <ImportarExcelButton onSuccess={invalidateProductos} />
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={16} /> Nuevo producto
          </Button>
        </div>
      </div>

      {/* Panel de gestión de categorías (colapsable) */}
      {categoriasOpen && (
        <Card>
          <h2 className="mb-3 text-base font-semibold text-text">Categorías de productos</h2>
          <CategoriasProductoPanel categorias={categorias} />
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-text-muted">Productos activos</p>
          <p className="mt-3 text-3xl font-bold text-text">{productosQuery.data?.data.data.total ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-muted">Alertas de stock</p>
          <p className="mt-3 text-3xl font-bold text-yellow-300">{stockBajo.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-muted">Sin stock</p>
          <p className="mt-3 text-3xl font-bold text-red-300">
            {stockBajo.filter((producto) => Number(producto.stock_actual) <= 0).length}
          </p>
        </Card>
      </div>

      <Card>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_auto]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nombre, código o marca..."
              className="w-full rounded-xl border border-border bg-surface-3 px-10 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            />
          </div>

          <select
            value={categoriaId}
            onChange={(event) => {
              setCategoriaId(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </select>

          <button
            onClick={() => updateStockFilter(!soloStockBajo)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
              soloStockBajo
                ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                : "border-border bg-surface-3 text-text-muted hover:text-text"
            }`}
          >
            <SlidersHorizontal size={16} />
            Solo stock bajo
          </button>
        </div>
      </Card>

      {stockBajo.length ? (
        <div className="flex items-start gap-3 rounded-2xl border border-yellow-500/25 bg-yellow-500/10 px-4 py-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-yellow-300" />
          <div className="text-sm">
            <p className="font-medium text-yellow-200">Hay {stockBajo.length} producto(s) en alerta de reposición.</p>
            <p className="mt-1 text-yellow-100/80">
              Usá el filtro de stock bajo para revisar faltantes y ajustar cantidades rápidamente.
            </p>
          </div>
        </div>
      ) : null}

      <Card padding={false}>
        {productosQuery.isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={6} />
          </div>
        ) : productos.length === 0 ? (
          <EmptyState
            title="No hay productos para mostrar"
            description={
              search || categoriaId || soloStockBajo
                ? "No encontramos productos con los filtros elegidos."
                : "Cargá el stock inicial del taller para empezar a controlarlo desde el sistema."
            }
            action={
              search || categoriaId || soloStockBajo
                ? undefined
                : {
                    label: "Crear producto",
                    onClick: () => setModalOpen(true),
                  }
            }
          />
        ) : (
          <>
            {/* Vista mobile: tarjetas */}
            <div className="divide-y divide-border/60 md:hidden">
              {productos.map((producto) => (
                <div key={producto.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-text">{producto.nombre}</div>
                      <div className="text-xs text-text-muted">
                        {producto.codigo || "Sin código"} · {producto.marca || "Sin marca"}
                      </div>
                    </div>
                    <span className="shrink-0 font-semibold text-text">{formatMoney(producto.precio_venta)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StockBadge actual={producto.stock_actual} minimo={producto.stock_minimo} />
                      <span className="text-xs text-text-muted">
                        {Number(producto.stock_actual).toLocaleString("es-AR")} {producto.unidad}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(producto); setModalOpen(true); }}>
                        <Pencil size={15} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setAdjusting(producto); setAjusteOpen(true); }}>
                        Ajustar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEliminar(producto)}>
                        <Trash2 size={15} className="text-red-300" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Vista desktop: tabla completa */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Precio venta</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((producto) => (
                    <tr key={producto.id} className="border-b border-border/60 transition hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">{producto.nombre}</div>
                        <div className="text-xs text-text-muted">
                          {producto.codigo || "Sin código"} · {producto.marca || "Sin marca"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="blue">{producto.categoria_nombre}</Badge>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{producto.proveedor_nombre || "Sin proveedor"}</td>
                      <td className="px-4 py-3 font-semibold text-text">{formatMoney(producto.precio_venta)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-text">
                            {Number(producto.stock_actual).toLocaleString("es-AR")} {producto.unidad}
                          </span>
                          <div className="flex items-center gap-2">
                            <StockBadge actual={producto.stock_actual} minimo={producto.stock_minimo} />
                            <span className="text-xs text-text-muted">
                              Min {Number(producto.stock_minimo).toLocaleString("es-AR")}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(producto);
                              setModalOpen(true);
                            }}
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAdjusting(producto);
                              setAjusteOpen(true);
                            }}
                          >
                            Ajustar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEliminar(producto)}>
                            <Trash2 size={15} className="text-red-300" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {total > 12 ? (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
                <span className="text-text-muted">
                  Mostrando {(page - 1) * 12 + 1} - {Math.min(page * 12, total)} de {total}
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page * 12 >= total}
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

      <ProductoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSuccess={invalidateProductos}
      />

      <AjusteStockModal
        open={ajusteOpen}
        onClose={() => setAjusteOpen(false)}
        producto={adjusting}
        onSuccess={invalidateProductos}
      />

      <ConfirmModal {...confirmModalProps} loading={deleteMutation.isPending} />
    </div>
  );
}

function ImportarExcelButton({ onSuccess }: { onSuccess: () => void }) {
  const { add } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("archivo", file);
    setLoading(true);

    try {
      const { data } = await productosApi.importarExcel(formData);
      const errores = data.data.errores.length;
      add(
        errores
          ? `${data.data.creados} producto(s) importados. ${errores} fila(s) tuvieron errores.`
          : `${data.data.creados} producto(s) importados correctamente.`
      );
      onSuccess();
    } catch (error) {
      add(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
      <Button variant="secondary" loading={loading} onClick={() => inputRef.current?.click()}>
        <Upload size={15} /> Importar Excel
      </Button>
    </>
  );
}

function DescargarPlantillaButton() {
  const handleDownload = () => {
    const headers = ["Nombre", "Código", "Marca", "Precio costo", "Precio venta", "Stock", "Stock mínimo", "Unidad"];
    const ejemplo = ["Aceite 10W40 1L", "ACE-001", "Castrol", "1500", "2500", "20", "5", "unidad"];
    const csv = [headers, ejemplo].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "plantilla_productos.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="ghost" onClick={handleDownload}>
      <Download size={15} /> Descargar plantilla
    </Button>
  );
}
