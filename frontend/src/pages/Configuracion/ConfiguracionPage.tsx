import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { AlertTriangle, Building2, DollarSign, FileText, Package, Shield, Upload } from "lucide-react";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { adminApi } from "../../features/admin/api";
import { configuracionApi, type ConfiguracionData } from "../../features/configuracion/api";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { Skeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { useAuthStore } from "../../shared/store/authStore";

const FRASE_RESET = "VACIAR BASE";

const defaultValues: ConfiguracionData = {
  taller_nombre: "",
  taller_direccion: "",
  taller_telefono: "",
  taller_cuit: "",
  taller_logo_url: "",
  moneda_simbolo: "$",
  orden_prefijo: "ORD",
  remito_prefijo: "REM",
  stock_minimo_default: "5",
  iva_porcentaje_default: "21",
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function ConfiguracionPage() {
  const { add } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((state) => state.empleado?.permisos?.["*"] === "rw");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [resetOpen, setResetOpen] = useState(false);
  const lastSavedRef = useRef(JSON.stringify(defaultValues));
  const initializedRef = useRef(false);

  const configuracionQuery = useQuery({
    queryKey: ["configuracion"],
    queryFn: () => configuracionApi.obtener(),
    staleTime: 5 * 60_000,
  });

  const { control, getValues, register, reset } = useForm<ConfiguracionData>({
    defaultValues,
  });

  const watchedValues = useWatch({ control });

  useEffect(() => {
    if (!configuracionQuery.data) {
      return;
    }

    const nextValues = {
      ...defaultValues,
      ...configuracionQuery.data.data.data,
    };

    reset(nextValues);
    lastSavedRef.current = JSON.stringify(nextValues);
    initializedRef.current = true;
    setSaveState("saved");
  }, [configuracionQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: ConfiguracionData) => configuracionApi.actualizar(values),
    onSuccess: (_, values) => {
      lastSavedRef.current = JSON.stringify(values);
      setSaveState("saved");
    },
    onError: (error) => {
      setSaveState("error");
      add(getErrorMessage(error), "error");
    },
  });

  const logoMutation = useMutation({
    mutationFn: (formData: FormData) => configuracionApi.subirLogo(formData),
    onSuccess: ({ data }) => {
      const nextValues = {
        ...getValues(),
        taller_logo_url: data.data.logo_url,
      };

      reset(nextValues);
      lastSavedRef.current = JSON.stringify(nextValues);
      setSaveState("saved");
      add("Logo actualizado.");
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  useEffect(() => {
    if (!initializedRef.current || !watchedValues) {
      return;
    }

    const serialized = JSON.stringify(watchedValues);
    if (serialized === lastSavedRef.current) {
      return;
    }

    setSaveState("saving");

    const timeout = setTimeout(() => {
      saveMutation.mutate({
        ...defaultValues,
        ...watchedValues,
      });
    }, 700);

    return () => clearTimeout(timeout);
  }, [saveMutation, watchedValues]);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("logo", file);
    setSaveState("saving");
    logoMutation.mutate(formData);
    event.target.value = "";
  };

  if (configuracionQuery.isLoading) {
    return <ConfiguracionLoading />;
  }

  if (configuracionQuery.isError) {
    return (
      <Card>
        <EmptyState
          title="No se pudo cargar la configuración"
          description="Volvé a intentar en unos segundos para editar los datos del taller."
          icon={Building2}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Configuración del taller</h1>
          <p className="mt-1 text-sm text-text-muted">
            Personalizá el sistema a medida del negocio. Los cambios se guardan automáticamente.
          </p>
        </div>
        <SaveIndicator state={saveState} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_340px]">
        <div className="space-y-5">
          <SeccionConfig titulo="Datos del negocio" icono={Building2}>
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Nombre del taller" {...register("taller_nombre")} />
              <Input label="Teléfono" {...register("taller_telefono")} />
            </div>
            <Input label="Dirección" {...register("taller_direccion")} />
            <Input label="CUIT" {...register("taller_cuit")} />
          </SeccionConfig>

          <SeccionConfig titulo="Moneda del sistema" icono={DollarSign}>
            <Input
              label="Símbolo de moneda"
              hint='Aparece antes de todos los montos. Ejemplo: "$", "USD", "€".'
              maxLength={10}
              {...register("moneda_simbolo")}
            />
            <Input
              label="IVA predeterminado (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              hint="Se precarga en ordenes y caja rapida; puede cambiarse en cada operacion."
              {...register("iva_porcentaje_default")}
            />
          </SeccionConfig>

          <SeccionConfig titulo="Numeración de documentos" icono={FileText}>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Prefijo de órdenes de trabajo"
                hint='Ejemplo: "ORD" genera ORD-0001, ORD-0002...'
                maxLength={10}
                {...register("orden_prefijo")}
              />
              <Input
                label="Prefijo de remitos"
                hint='Ejemplo: "REM" genera REM-0001, REM-0002...'
                maxLength={10}
                {...register("remito_prefijo")}
              />
            </div>
          </SeccionConfig>

          <SeccionConfig titulo="Stock y alertas" icono={Package}>
            <p className="text-sm text-text-muted">
              Definí a partir de qué cantidad el sistema te avisa que un producto está por agotarse. Este valor es
              predeterminado y podés cambiarlo producto por producto.
            </p>
            <Input
              label="Stock mínimo predeterminado"
              type="number"
              min="0"
              hint="Si un producto cae a esta cantidad o menos, aparecerá la alerta de stock bajo."
              {...register("stock_minimo_default")}
            />
          </SeccionConfig>
        </div>

        <div className="space-y-5">
          <SeccionConfig titulo="Logo e identidad" icono={Upload}>
            <div className="space-y-4">
              <div className="flex h-40 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-surface-2">
                {watchedValues?.taller_logo_url ? (
                  <img
                    src={watchedValues.taller_logo_url}
                    alt="Logo del taller"
                    className="h-full w-full object-contain p-4"
                  />
                ) : (
                  <div className="px-6 text-center text-sm text-text-muted">
                    Subí el logo del taller para usarlo en la aplicación y en los remitos.
                  </div>
                )}
              </div>

              <label className="block">
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                <span className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-3 px-4 py-2.5 text-sm text-text transition hover:bg-surface-2">
                  <Upload size={16} />
                  {logoMutation.isPending ? "Subiendo logo..." : "Subir logo"}
                </span>
              </label>
            </div>
          </SeccionConfig>

          <SeccionConfig titulo="Empleados y acceso" icono={Shield}>
            <p className="text-sm text-text-muted">
              Desde la gestión de empleados podés asignar roles, permisos y accesos por módulo.
            </p>
            <Link
              to="/empleados"
              className={clsx(
                "inline-flex items-center justify-center rounded-xl border border-border bg-surface-3 px-4 py-2.5 text-sm font-medium text-text transition",
                "hover:bg-surface-2"
              )}
            >
              Ir a empleados
            </Link>
          </SeccionConfig>
        </div>
      </div>

      {/* Zona peligrosa — solo administradores */}
      {isAdmin ? (
        <Card>
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <h2 className="text-base font-semibold text-red-400">Zona peligrosa</h2>
          </div>
          <div className="mt-4 flex flex-col gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text">Vaciar base de datos</p>
              <p className="mt-1 text-sm text-text-muted">
                Elimina permanentemente clientes, vehículos, órdenes, productos, servicios,
                proveedores, cobros, compras y gastos. Solo se conservan empleados, roles y
                configuración. Esta acción es irreversible.
              </p>
            </div>
            <Button
              variant="danger"
              onClick={() => setResetOpen(true)}
              className="shrink-0"
            >
              <AlertTriangle size={15} />
              Vaciar base
            </Button>
          </div>
        </Card>
      ) : null}

      <ResetModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onSuccess={() => { queryClient.clear(); window.location.reload(); }}
      />
    </div>
  );
}

function ResetModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { add } = useToast();
  const [frase, setFrase] = useState("");

  useEffect(() => {
    if (!open) setFrase("");
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => adminApi.resetDatabase(FRASE_RESET),
    onSuccess: ({ data }) => {
      add(data.message);
      onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  return (
    <Modal open={open} onClose={onClose} title="Vaciar base de datos" size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-sm text-red-200">
            Esta acción eliminará permanentemente <strong>todos los datos operativos</strong>.
            Solo se conservan empleados, roles y configuración.{" "}
            <strong>No hay forma de deshacer esto.</strong>
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">
            Escribí{" "}
            <span className="font-mono font-bold text-text">{FRASE_RESET}</span>{" "}
            para confirmar
          </label>
          <input
            value={frase}
            onChange={(e) => setFrase(e.target.value)}
            placeholder={FRASE_RESET}
            autoComplete="off"
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 font-mono text-sm text-text outline-none transition focus:border-red-400"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            type="button"
            disabled={frase !== FRASE_RESET}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <AlertTriangle size={15} />
            Confirmar vaciado
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") {
    return <span className="text-sm text-yellow-300">Guardando cambios...</span>;
  }

  if (state === "saved") {
    return <span className="text-sm text-green-300">Cambios guardados</span>;
  }

  if (state === "error") {
    return <span className="text-sm text-red-300">No se pudieron guardar los cambios</span>;
  }

  return <span className="text-sm text-text-muted">Sin cambios pendientes</span>;
}

function SeccionConfig({
  titulo,
  icono: Icon,
  children,
}: {
  titulo: string;
  icono: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-text">
        <Icon size={16} className="text-primary" /> {titulo}
      </h2>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function ConfiguracionLoading() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_340px]">
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <Skeleton className="h-5 w-44" />
              <div className="mt-4 space-y-3">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-5">
          <Card>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-4 h-40 w-full" />
          </Card>
          <Card>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-4 h-20 w-full" />
          </Card>
        </div>
      </div>
    </div>
  );
}
