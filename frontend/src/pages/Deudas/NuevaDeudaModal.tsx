import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, Plus, Search, UserPlus, X } from "lucide-react";
import { clientesApi } from "../../features/clientes/api";
import { deudasApi } from "../../features/deudas/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const schema = z.object({
  cliente_id: z.string().min(1, "Seleccioná un cliente"),
  concepto: z.string().min(1, "El concepto es obligatorio"),
  monto_original: z.string().min(1, "El monto es obligatorio"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  notas: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  defaultClienteId?: number | null;
}

/* ── Searchable client selector with inline creation ── */

interface ClienteOption {
  id: number;
  nombre: string;
  apellido: string;
  telefono?: string | null;
}

function ClienteSelector({
  value,
  onChange,
  disabled,
  error,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  const { add } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [creatingCliente, setCreatingCliente] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoApellido, setNuevoApellido] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const clientesQuery = useQuery({
    queryKey: ["clientes", "deuda-selector", debouncedSearch],
    queryFn: () => clientesApi.listar({ page: 1, limit: 50, q: debouncedSearch.trim() || undefined }),
    staleTime: 60_000,
  });

  const selectedClienteQuery = useQuery({
    queryKey: ["clientes", "detalle", value],
    queryFn: () => clientesApi.obtener(Number(value)),
    enabled: Boolean(value),
    staleTime: 60_000,
  });

  const clientes: ClienteOption[] = clientesQuery.data?.data.data.rows ?? [];
  const selectedObj = selectedClienteQuery.data?.data.data;
  
  const selectedCliente: ClienteOption | null = value 
    ? clientes.find((c) => String(c.id) === value) || (selectedObj ? { id: selectedObj.id, nombre: selectedObj.nombre, apellido: selectedObj.apellido, telefono: selectedObj.telefono } : null) 
    : null;

  const filtered = clientes;

  const crearClienteMutation = useMutation({
    mutationFn: () =>
      clientesApi.crear({
        nombre: nuevoNombre.trim(),
        apellido: nuevoApellido.trim(),
        telefono: nuevoTelefono.trim() || undefined,
      }),
    onSuccess: (res) => {
      const nuevo = res.data.data;
      add("Cliente creado.");
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      onChange(String(nuevo.id));
      setCreatingCliente(false);
      setNuevoNombre("");
      setNuevoApellido("");
      setNuevoTelefono("");
      setDropdownOpen(false);
    },
    onError: (err) => add(getErrorMessage(err), "error"),
  });

  const handleSelect = (c: ClienteOption) => {
    onChange(String(c.id));
    setSearch("");
    setDropdownOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setSearch("");
    inputRef.current?.focus();
  };

  if (disabled && selectedCliente) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-muted">Cliente</label>
        <div className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text opacity-60">
          {selectedCliente.apellido}, {selectedCliente.nombre}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <label className="text-sm font-medium text-text-muted">Cliente</label>

      {/* Selected chip OR search input */}
      {selectedCliente && !dropdownOpen ? (
        <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2.5 text-sm">
          <span className="flex-1 font-medium text-text">
            {selectedCliente.apellido}, {selectedCliente.nombre}
            {selectedCliente.telefono && (
              <span className="ml-2 text-text-muted">· {selectedCliente.telefono}</span>
            )}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg p-0.5 text-text-muted transition hover:bg-surface-3 hover:text-text"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Buscar por nombre, apellido o teléfono..."
            className="w-full rounded-xl border border-border bg-surface-3 py-2.5 pl-9 pr-9 text-sm text-text outline-none transition focus:border-primary"
          />
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
        </div>
      )}

      {/* Dropdown */}
      {dropdownOpen && (
        <div className="relative z-30">
          <div className="absolute left-0 right-0 top-0 max-h-52 overflow-y-auto rounded-xl border border-border bg-surface-2 shadow-lg">
            {clientesQuery.isLoading ? (
              <div className="px-3 py-4 text-center text-sm text-text-muted">Cargando clientes...</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-text-muted">
                {search ? "Sin resultados." : "No hay clientes cargados."}
              </div>
            ) : (
              filtered.slice(0, 50).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-surface-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {c.apellido[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-text">{c.apellido}, {c.nombre}</span>
                    {c.telefono && <span className="ml-2 text-text-muted">· {c.telefono}</span>}
                  </div>
                </button>
              ))
            )}

            {/* Create client inline */}
            <div className="border-t border-border">
              {!creatingCliente ? (
                <button
                  type="button"
                  onClick={() => setCreatingCliente(true)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/5"
                >
                  <UserPlus size={14} />
                  Crear cliente nuevo
                </button>
              ) : (
                <div className="space-y-2 px-3 py-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Plus size={12} /> Nuevo cliente
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      placeholder="Nombre *"
                      className="rounded-lg border border-border bg-surface-3 px-2.5 py-2 text-sm text-text outline-none transition focus:border-primary"
                    />
                    <input
                      type="text"
                      value={nuevoApellido}
                      onChange={(e) => setNuevoApellido(e.target.value)}
                      placeholder="Apellido *"
                      className="rounded-lg border border-border bg-surface-3 px-2.5 py-2 text-sm text-text outline-none transition focus:border-primary"
                    />
                  </div>
                  <input
                    type="text"
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    placeholder="Teléfono (opcional)"
                    className="w-full rounded-lg border border-border bg-surface-3 px-2.5 py-2 text-sm text-text outline-none transition focus:border-primary"
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setCreatingCliente(false);
                        setNuevoNombre("");
                        setNuevoApellido("");
                        setNuevoTelefono("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!nuevoNombre.trim() || !nuevoApellido.trim()}
                      loading={crearClienteMutation.isPending}
                      onClick={() => crearClienteMutation.mutate()}
                    >
                      Crear y seleccionar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <span className="text-xs text-red-300">{error}</span>}
    </div>
  );
}

/* ── NuevaDeudaModal ── */

export function NuevaDeudaModal({ open, onClose, defaultClienteId }: Props) {
  const { add } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fecha: todayISO() },
  });

  const clienteIdValue = watch("cliente_id");

  useEffect(() => {
    if (open) {
      reset({
        cliente_id: defaultClienteId ? String(defaultClienteId) : "",
        concepto: "",
        monto_original: "",
        fecha: todayISO(),
        notas: "",
      });
    }
  }, [open, defaultClienteId, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      deudasApi.crear({
        cliente_id: Number(values.cliente_id),
        concepto: values.concepto,
        monto_original: Number(values.monto_original),
        fecha: values.fecha,
        notas: values.notas || null,
      }),
    onSuccess: () => {
      add("Deuda registrada.");
      queryClient.invalidateQueries({ queryKey: ["deudas"] });
      queryClient.invalidateQueries({ queryKey: ["deudas-resumen"] });
      onClose();
    },
    onError: (err) => add(getErrorMessage(err), "error"),
  });

  return (
    <Modal open={open} onClose={onClose} title="Registrar deuda" size="md">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <ClienteSelector
          value={clienteIdValue || ""}
          onChange={(id) => setValue("cliente_id", id, { shouldValidate: true })}
          disabled={Boolean(defaultClienteId)}
          error={errors.cliente_id?.message}
        />

        <Input label="Concepto" placeholder="Ej: Servicio anterior, deuda pendiente..." {...register("concepto")} error={errors.concepto?.message} />

        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Monto ($)" type="number" min="0.01" step="0.01" {...register("monto_original")} error={errors.monto_original?.message} />
          <Input label="Fecha" type="date" {...register("fecha")} error={errors.fecha?.message} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Notas (opcional)</label>
          <textarea
            rows={3}
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            placeholder="Información adicional..."
            {...register("notas")}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={mutation.isPending}>Registrar deuda</Button>
        </div>
      </form>
    </Modal>
  );
}
