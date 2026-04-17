import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Car, ClipboardList, Loader2, Search, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "../../shared/hooks/useDebounce";
import { useAuthStore } from "../../shared/store/authStore";
import { busquedaApi } from "./api";

export function SearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  const hasPermiso = useAuthStore((state) => state.hasPermiso);
  const canSearch = hasPermiso("clientes") || hasPermiso("vehiculos");

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "k" || event.key.toLowerCase() === "b")) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const queryResult = useQuery({
    queryKey: ["busqueda-global", debouncedQuery],
    queryFn: () => busquedaApi.buscar(debouncedQuery),
    enabled: canSearch && debouncedQuery.trim().length >= 2,
    staleTime: 0,
  });

  const results = queryResult.data?.data.data;
  const hasResults = Boolean(results && results.total > 0);

  const goTo = (path: string) => {
    navigate(path);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setOpen(true);
            }
          }}
          placeholder="Buscar cliente o patente... (Ctrl+K)"
          className="w-full rounded-xl border border-border bg-surface-3 px-10 py-2.5 text-sm text-text outline-none transition focus:border-primary"
        />
        {queryResult.isFetching ? (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-text-muted" />
        ) : query ? (
          <button
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition hover:text-text"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
          {!canSearch ? (
            <div className="p-4 text-center text-sm text-text-muted">
              Tu usuario no tiene acceso a la búsqueda global.
            </div>
          ) : query.trim().length < 2 ? (
            <div className="p-4 text-center text-sm text-text-muted">
              Escribí al menos 2 caracteres para empezar a buscar.
            </div>
          ) : queryResult.isError ? (
            <div className="p-4 text-center text-sm text-red-300">
              No se pudo completar la búsqueda. Intentá de nuevo.
            </div>
          ) : !hasResults && !queryResult.isFetching ? (
            <div className="p-4 text-center text-sm text-text-muted">
              No encontramos resultados para <strong className="text-text">"{query}"</strong>.
            </div>
          ) : hasResults ? (
            <div className="max-h-96 overflow-y-auto">
              {results?.clientes.length ? (
                <section>
                  <div className="flex items-center gap-2 bg-surface-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    <Users size={12} /> Clientes
                  </div>
                  {results.clientes.map((cliente) => (
                    <button
                      key={`cliente-${cliente.id}`}
                      onClick={() => goTo(`/clientes/${cliente.id}`)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-surface-3"
                    >
                      <span className="text-sm font-medium text-text">
                        {cliente.apellido}, {cliente.nombre}
                      </span>
                      <span className="text-xs text-text-muted">{cliente.telefono || "Sin teléfono"}</span>
                    </button>
                  ))}
                </section>
              ) : null}

              {results?.vehiculos.length ? (
                <section className={clsx(results?.clientes.length ? "border-t border-border" : undefined)}>
                  <div className="flex items-center gap-2 bg-surface-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    <Car size={12} /> Vehículos por patente
                  </div>
                  {results.vehiculos.map((vehiculo) => (
                    <button
                      key={`vehiculo-${vehiculo.id}`}
                      onClick={() => goTo(`/vehiculos/${vehiculo.id}`)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-surface-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-accent">{vehiculo.patente}</span>
                        <span className="text-sm text-text-muted">
                          {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio || ""}
                        </span>
                      </div>
                      <span className="text-xs text-text-muted">{vehiculo.cliente_nombre}</span>
                    </button>
                  ))}
                </section>
              ) : null}

              {results?.ordenes.length ? (
                <section className="border-t border-border">
                  <div className="flex items-center gap-2 bg-surface-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    <ClipboardList size={12} /> Trabajos abiertos
                  </div>
                  {results.ordenes.map((orden) => (
                    <button
                      key={`orden-${orden.id}`}
                      onClick={() => goTo(`/ordenes/${orden.id}`)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-surface-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-primary">{orden.numero}</span>
                        <span className="text-sm text-text-muted">
                          {orden.patente} · {orden.cliente_nombre}
                        </span>
                      </div>
                      <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-300">
                        {orden.estado}
                      </span>
                    </button>
                  ))}
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
