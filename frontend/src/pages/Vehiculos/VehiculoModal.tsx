import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { clientesApi } from "../../features/clientes/api";
import { vehiculosApi, type Vehiculo } from "../../features/vehiculos/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";

const schema = z.object({
  cliente_id: z.string().min(1, "Selecciona un cliente"),
  patente: z.string().min(6, "La patente es inválida"),
  marca: z.string().min(1, "La marca es obligatoria"),
  modelo: z.string().min(1, "El modelo es obligatorio"),
  anio: z.string().optional(),
  color: z.string().optional(),
  tipo_combustible: z.string().optional(),
  numero_motor: z.string().optional(),
  numero_chasis: z.string().optional(),
  km_ultimo_service: z.string().optional(),
  observaciones: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface VehiculoModalProps {
  open: boolean;
  onClose: () => void;
  editing: Vehiculo | null;
  initialClienteId?: number | null;
  onSuccess: () => void;
}

export function VehiculoModal({
  open,
  onClose,
  editing,
  initialClienteId,
  onSuccess,
}: VehiculoModalProps) {
  const { add } = useToast();
  const isEditing = Boolean(editing);

  const clientesQuery = useQuery({
    queryKey: ["clientes", "modal-select"],
    queryFn: () => clientesApi.listar({ page: 1, limit: 100 }),
    enabled: open,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (editing) {
      reset({
        cliente_id: String(editing.cliente_id),
        patente: editing.patente,
        marca: editing.marca,
        modelo: editing.modelo,
        anio: editing.anio ? String(editing.anio) : "",
        color: editing.color || "",
        tipo_combustible: editing.tipo_combustible,
        numero_motor: editing.numero_motor || "",
        numero_chasis: editing.numero_chasis || "",
        km_ultimo_service: editing.km_ultimo_service ? String(editing.km_ultimo_service) : "",
        observaciones: editing.observaciones || "",
      });
      return;
    }

    reset({
      cliente_id: initialClienteId ? String(initialClienteId) : "",
      patente: "",
      marca: "",
      modelo: "",
      anio: "",
      color: "",
      tipo_combustible: "nafta",
      numero_motor: "",
      numero_chasis: "",
      km_ultimo_service: "0",
      observaciones: "",
    });
  }, [editing, initialClienteId, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormData) => {
      const payload = {
        cliente_id: Number(values.cliente_id),
        patente: values.patente,
        marca: values.marca,
        modelo: values.modelo,
        anio: values.anio ? Number(values.anio) : null,
        color: values.color || null,
        tipo_combustible: values.tipo_combustible || "nafta",
        numero_motor: values.numero_motor || null,
        numero_chasis: values.numero_chasis || null,
        km_ultimo_service: values.km_ultimo_service ? Number(values.km_ultimo_service) : 0,
        observaciones: values.observaciones || null,
      };

      return isEditing
        ? vehiculosApi.actualizar(editing!.id, payload)
        : vehiculosApi.crear(payload);
    },
    onSuccess: () => {
      add(isEditing ? "Vehículo actualizado." : "Vehículo creado.");
      onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const clientes = clientesQuery.data?.data.data.rows ?? [];
  const clientePlaceholder = clientesQuery.isLoading
    ? "Cargando clientes..."
    : clientesQuery.isError
      ? "No se pudieron cargar los clientes"
      : clientes.length === 0
        ? "No hay clientes registrados"
        : "Seleccionar cliente";

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar vehículo" : "Nuevo vehículo"} size="lg">
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Cliente</label>
            <select
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary disabled:opacity-60"
              disabled={clientesQuery.isLoading}
              style={{ colorScheme: "dark" }}
              {...register("cliente_id")}
            >
              <option value="" className="bg-surface text-text">
                {clientePlaceholder}
              </option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={String(cliente.id)} className="bg-surface text-text">
                  {cliente.apellido}, {cliente.nombre}
                </option>
              ))}
            </select>
            {errors.cliente_id ? <span className="text-xs text-red-300">{errors.cliente_id.message}</span> : null}
            {clientesQuery.isError ? (
              <div className="flex items-center gap-2 text-xs text-red-300">
                <span>No se pudo cargar la lista de clientes.</span>
                <button
                  type="button"
                  onClick={() => clientesQuery.refetch()}
                  className="font-medium text-primary hover:underline"
                >
                  Reintentar
                </button>
              </div>
            ) : null}
            {!clientesQuery.isLoading && !clientesQuery.isError && clientes.length === 0 ? (
              <span className="text-xs text-yellow-300">
                No hay clientes disponibles. Creá uno antes de registrar el vehículo.
              </span>
            ) : null}
          </div>
          <Input label="Patente" error={errors.patente?.message} {...register("patente")} disabled={isEditing} />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Marca" error={errors.marca?.message} {...register("marca")} />
          <Input label="Modelo" error={errors.modelo?.message} {...register("modelo")} />
          <Input label="Año" type="number" {...register("anio")} />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Color" {...register("color")} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Combustible</label>
            <select
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
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
          <Input label="Km último service" type="number" {...register("km_ultimo_service")} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Número de motor" {...register("numero_motor")} />
          <Input label="Número de chasis" {...register("numero_chasis")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Observaciones</label>
          <textarea
            rows={3}
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            {...register("observaciones")}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEditing ? "Guardar cambios" : "Crear vehículo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
