import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AxiosError } from "axios";
import clsx from "clsx";
import { AlertTriangle, ChevronDown, Zap } from "lucide-react";
import { clientesApi, type RegistroExpressResponse } from "../../features/clientes/api";
import { vehiculosApi, type VehiculoBusqueda } from "../../features/vehiculos/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";

// ─── Schema (mismas reglas que el backend) ────────────────────────────────────

const schema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellido: z.string().min(1, "El apellido es obligatorio"),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  patente: z.string().min(6, "Mínimo 6 caracteres"),
  marca: z.string().min(1, "La marca es obligatoria"),
  modelo: z.string().min(1, "El modelo es obligatorio"),
  anio: z.string().optional(),
  color: z.string().optional(),
  tipo_combustible: z.string().optional(),
  km_actual: z.string().optional(),
  crear_orden: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface PatenteConflicto {
  vehiculo_id: number;
  cliente_id: number;
  cliente_nombre: string;
  patente: string;
  marca: string;
  modelo: string;
}

export interface RegistroExpressResult {
  clienteId: number;
  vehiculoId: number;
  crearOrden: boolean;
}

interface RegistroExpressModalProps {
  open: boolean;
  onClose: () => void;
  /** Callback tras registrar exitosamente. El padre decide qué hacer (navegar, llenar form, etc.) */
  onRegistrado: (result: RegistroExpressResult) => void;
  /** Oculta el checkbox "Abrir orden" cuando ya estamos dentro del contexto de crear una orden */
  hideCrearOrden?: boolean;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function RegistroExpressModal({
  open,
  onClose,
  onRegistrado,
  hideCrearOrden = false,
}: RegistroExpressModalProps) {
  const { add } = useToast();
  const queryClient = useQueryClient();

  const [expandido, setExpandido] = useState(false);
  const [patenteConflicto, setPatenteConflicto] = useState<PatenteConflicto | null>(null);
  const [verificandoPatente, setVerificandoPatente] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo_combustible: "nafta",
      km_actual: "0",
      crear_orden: true,
    },
  });

  const crearOrden = watch("crear_orden");

  // Reset completo al abrir / cerrar
  useEffect(() => {
    if (!open) return;
    reset({
      nombre: "",
      apellido: "",
      telefono: "",
      email: "",
      patente: "",
      marca: "",
      modelo: "",
      anio: "",
      color: "",
      tipo_combustible: "nafta",
      km_actual: "0",
      crear_orden: true,
    });
    setExpandido(false);
    setPatenteConflicto(null);
    // Autofocus después de que el modal termine de animar
    const t = setTimeout(() => setFocus("nombre"), 60);
    return () => clearTimeout(t);
  }, [open, reset, setFocus]);

  // ── Handlers de patente ─────────────────────────────────────────────────────

  // Destructuramos register("patente") para poder wrappear sus handlers
  const { onChange: onPatenteChange, onBlur: onPatenteBlur, ref: patenteRef, name: patenteName } =
    register("patente");

  const checkPatente = async (patente: string) => {
    if (patente.length < 6) return;
    setVerificandoPatente(true);
    try {
      const { data } = await vehiculosApi.buscarPorPatente(patente);
      if (data.data) {
        const v = data.data as VehiculoBusqueda;
        setPatenteConflicto({
          vehiculo_id: v.id,
          cliente_id: v.cliente_id,
          cliente_nombre: `${v.cliente_apellido}, ${v.cliente_nombre}`,
          patente: v.patente,
          marca: v.marca,
          modelo: v.modelo,
        });
      } else {
        setPatenteConflicto(null);
      }
    } catch {
      // Si falla la verificación no bloqueamos — el backend rechazará en submit si hay conflicto
    } finally {
      setVerificandoPatente(false);
    }
  };

  // ── Mutación ────────────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      clientesApi.registroExpress({
        nombre: values.nombre,
        apellido: values.apellido,
        telefono: values.telefono || undefined,
        email: values.email || undefined,
        patente: values.patente,
        marca: values.marca,
        modelo: values.modelo,
        anio: values.anio ? Number(values.anio) : undefined,
        color: values.color || undefined,
        tipo_combustible: values.tipo_combustible,
        km_actual: values.km_actual ? Number(values.km_actual) : 0,
      }),

    onSuccess: ({ data }, variables) => {
      const res = data.data as RegistroExpressResponse;

      add(`${res.cliente.apellido}, ${res.cliente.nombre} registrado correctamente.`);

      // Warning de teléfono duplicado — no cancela el registro pero avisa
      if (res.warning?.tipo === "TELEFONO_DUPLICADO") {
        add(
          `Aviso: el teléfono ya pertenece a ${res.warning.cliente_nombre}. Verificá que no sea el mismo cliente.`,
          "error"
        );
      }

      // Invalidar caches para que los selectores en OrdenModal y otras páginas muestren los nuevos registros
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["vehiculos"] });

      onRegistrado({
        clienteId: res.cliente.id,
        vehiculoId: res.vehiculo.id,
        crearOrden: !hideCrearOrden && (variables.crear_orden ?? true),
      });
      onClose();
    },

    onError: (error) => {
      // Caso especial: el backend confirmó que la patente ya existe
      if (error instanceof AxiosError && error.response?.data?.code === "PATENTE_DUPLICADA") {
        const details = error.response.data.details as PatenteConflicto;
        setPatenteConflicto(details);
        // También hace scroll/focus al campo de patente para que el usuario lo vea
        setTimeout(() => {
          const patenteInput = document.querySelector<HTMLInputElement>(`input[name="patente"]`);
          patenteInput?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
        return;
      }
      add(getErrorMessage(error), "error");
    },
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal open={open} onClose={onClose} title="Ingreso rápido" size="xl">
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="space-y-5"
      >
        {/* ── Columnas: cliente | vehículo ── */}
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">

          {/* CLIENTE */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Cliente
            </p>
            <Input
              label="Nombre *"
              autoComplete="off"
              error={errors.nombre?.message}
              {...register("nombre")}
            />
            <Input
              label="Apellido *"
              autoComplete="off"
              error={errors.apellido?.message}
              {...register("apellido")}
            />
            <Input
              label="Teléfono"
              type="tel"
              autoComplete="off"
              {...register("telefono")}
            />
          </div>

          {/* VEHÍCULO */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Vehículo
            </p>

            {/* Patente — campo con handlers personalizados */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-muted">Patente *</label>
              <input
                name={patenteName}
                ref={patenteRef}
                autoComplete="off"
                placeholder="ABC123"
                className={clsx(
                  "rounded-xl border bg-surface-3 px-3 py-2.5 text-sm font-mono uppercase tracking-widest text-text outline-none transition",
                  "placeholder:text-text-muted focus:border-primary",
                  errors.patente
                    ? "border-danger"
                    : patenteConflicto
                      ? "border-yellow-500"
                      : "border-border"
                )}
                onChange={(e) => {
                  // Normalizar: uppercase sin espacios en tiempo real
                  e.target.value = e.target.value.replace(/\s+/g, "").toUpperCase();
                  void onPatenteChange(e);
                  setPatenteConflicto(null);
                }}
                onBlur={async (e) => {
                  void onPatenteBlur(e);
                  await checkPatente(e.target.value);
                }}
              />
              {errors.patente ? (
                <span className="text-xs text-red-300">{errors.patente.message}</span>
              ) : verificandoPatente ? (
                <span className="text-xs text-text-muted">Verificando...</span>
              ) : null}
            </div>

            {/* Banner de patente duplicada */}
            {patenteConflicto ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-yellow-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-yellow-200">Patente ya registrada</p>
                  <p className="text-xs text-yellow-200/80">
                    {patenteConflicto.marca} {patenteConflicto.modelo}
                    {" · "}
                    {patenteConflicto.cliente_nombre}
                  </p>
                </div>
              </div>
            ) : null}

            <Input
              label="Marca *"
              autoComplete="off"
              error={errors.marca?.message}
              {...register("marca")}
            />
            <Input
              label="Modelo *"
              autoComplete="off"
              error={errors.modelo?.message}
              {...register("modelo")}
            />
          </div>
        </div>

        {/* ── Sección expandible de campos opcionales ── */}
        <div>
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-text-muted transition hover:text-text"
          >
            <ChevronDown
              size={14}
              className={clsx("transition-transform duration-200", expandido && "rotate-180")}
            />
            {expandido ? "Ocultar" : "Más"} datos opcionales
          </button>

          {expandido ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Input
                label="Email"
                type="email"
                autoComplete="off"
                error={errors.email?.message}
                {...register("email")}
              />
              <Input label="Color del vehículo" autoComplete="off" {...register("color")} />
              <Input label="Año" type="number" min="1950" max={new Date().getFullYear() + 1} {...register("anio")} />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-muted">Combustible</label>
                <select
                  className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
                  style={{ colorScheme: "dark" }}
                  {...register("tipo_combustible")}
                >
                  <option value="nafta">Nafta</option>
                  <option value="diesel">Diésel</option>
                  <option value="gnc">GNC</option>
                  <option value="gnc_nafta">GNC + Nafta</option>
                  <option value="hibrido">Híbrido</option>
                  <option value="electrico">Eléctrico</option>
                </select>
              </div>
              <Input label="Km actuales" type="number" min="0" {...register("km_actual")} />
            </div>
          ) : null}
        </div>

        {/* ── Checkbox "Abrir orden" ── */}
        {!hideCrearOrden ? (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              {...register("crear_orden")}
            />
            <span className="text-sm text-text">Abrir orden de trabajo inmediatamente</span>
          </label>
        ) : null}

        {/* ── Acciones ── */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            disabled={patenteConflicto !== null}
          >
            <Zap size={15} />
            {!hideCrearOrden && crearOrden ? "Registrar y crear orden" : "Registrar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
