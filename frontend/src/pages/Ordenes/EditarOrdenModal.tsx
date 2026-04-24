import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { clientesApi } from "../../features/clientes/api";
import { ordenesApi, type Orden } from "../../features/ordenes/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";

const schema = z.object({
  cliente_id: z.string().min(1, "Selecciona un cliente"),
  vehiculo_id: z.string().min(1, "Selecciona un vehiculo"),
  fecha_ingreso: z.string().min(1, "La fecha es obligatoria"),
  km_entrada: z.string().optional(),
  notas_cliente: z.string().optional(),
  notas_mecanico: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  orden: Orden;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export function EditarOrdenModal({ open, orden, onClose, onSuccess }: Props) {
  const { add } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const clienteId = watch("cliente_id");
  const clienteRegister = register("cliente_id");

  const clientesQuery = useQuery({
    queryKey: ["clientes", "modal-select"],
    queryFn: () => clientesApi.listar({ page: 1, limit: 100 }),
    staleTime: 5 * 60_000,
  });

  const clienteDetalleQuery = useQuery({
    queryKey: ["cliente-vehiculos-select", clienteId],
    queryFn: () => clientesApi.obtener(Number(clienteId)),
    enabled: open && Boolean(clienteId),
  });

  useEffect(() => {
    if (!open) return;
    reset({
      cliente_id: String(orden.cliente_id),
      vehiculo_id: String(orden.vehiculo_id),
      fecha_ingreso: String(orden.created_at).slice(0, 10),
      km_entrada: String(orden.km_entrada || 0),
      notas_cliente: orden.notas_cliente || "",
      notas_mecanico: orden.notas_mecanico || "",
    });
  }, [open, orden, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      ordenesApi.actualizar(orden.id, {
        cliente_id: Number(values.cliente_id),
        vehiculo_id: Number(values.vehiculo_id),
        fecha_ingreso: values.fecha_ingreso,
        km_entrada: values.km_entrada ? Number(values.km_entrada) : 0,
        notas_cliente: values.notas_cliente || null,
        notas_mecanico: values.notas_mecanico || null,
      }),
    onSuccess: async () => {
      add("Orden actualizada.");
      await onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const clientes = clientesQuery.data?.data.data.rows ?? [];
  const vehiculos = clienteDetalleQuery.data?.data.data.vehiculos ?? [];

  return (
    <Modal open={open} onClose={onClose} title="Editar orden de trabajo" size="lg">
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Cliente</label>
          <select
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            {...clienteRegister}
            onChange={(event) => {
              clienteRegister.onChange(event);
              setValue("vehiculo_id", "", { shouldValidate: true });
            }}
          >
            <option value="">Seleccionar cliente</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={String(cliente.id)}>
                {cliente.apellido}, {cliente.nombre}
              </option>
            ))}
          </select>
          {errors.cliente_id ? <span className="text-xs text-red-300">{errors.cliente_id.message}</span> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Vehiculo</label>
          <select
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            disabled={!clienteId || clienteDetalleQuery.isLoading}
            {...register("vehiculo_id")}
          >
            <option value="">
              {clienteDetalleQuery.isLoading ? "Cargando vehiculos..." : "Seleccionar vehiculo"}
            </option>
            {vehiculos.map((vehiculo) => (
              <option key={vehiculo.id} value={String(vehiculo.id)}>
                {vehiculo.patente} - {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio || ""}
              </option>
            ))}
          </select>
          {errors.vehiculo_id ? <span className="text-xs text-red-300">{errors.vehiculo_id.message}</span> : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Fecha de ingreso" type="date" error={errors.fecha_ingreso?.message} {...register("fecha_ingreso")} />
          <Input label="Km de entrada" type="number" min="0" {...register("km_entrada")} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Notas del cliente</label>
            <textarea
              rows={4}
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              {...register("notas_cliente")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Notas del mecanico</label>
            <textarea
              rows={4}
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              {...register("notas_mecanico")}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={mutation.isPending}>Guardar cambios</Button>
        </div>
      </form>
    </Modal>
  );
}
