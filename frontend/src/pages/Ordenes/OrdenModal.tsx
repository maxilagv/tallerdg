import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { UserPlus } from "lucide-react";
import { clientesApi } from "../../features/clientes/api";
import { ordenesApi } from "../../features/ordenes/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { RegistroExpressModal } from "./RegistroExpressModal";

const METODOS_ADELANTO = [
  { value: "efectivo",         label: "Efectivo" },
  { value: "transferencia",    label: "Transferencia" },
  { value: "tarjeta_debito",   label: "Tarjeta Débito" },
  { value: "tarjeta_credito",  label: "Tarjeta Crédito" },
  { value: "cheque",           label: "Cheque" },
];

const schema = z.object({
  cliente_id: z.string().min(1, "Selecciona un cliente"),
  vehiculo_id: z.string().min(1, "Selecciona un vehículo"),
  fecha_ingreso: z.string().min(1, "La fecha es obligatoria"),
  km_entrada: z.string().optional(),
  notas_cliente: z.string().optional(),
  adelanto: z.string().optional(),
  adelanto_metodo: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface OrdenModalProps {
  open: boolean;
  onClose: () => void;
  defaultClienteId?: number | null;
  defaultVehiculoId?: number | null;
  onCreated: (ordenId: number) => void;
}

export function OrdenModal({
  open,
  onClose,
  defaultClienteId,
  defaultVehiculoId,
  onCreated,
}: OrdenModalProps) {
  const { add } = useToast();
  const queryClient = useQueryClient();
  const [expressOpen, setExpressOpen] = useState(false);

  // Cuando se registra un cliente+vehículo express desde este modal, guardamos el vehiculoId
  // aquí hasta que la query de vehículos del cliente cargue y podamos seleccionarlo en el form.
  const pendingVehicleId = useRef<number | null>(null);

  const clientesQuery = useQuery({
    queryKey: ["clientes", "modal-select"],
    queryFn: () => clientesApi.listar({ page: 1, limit: 100 }),
    staleTime: 1000 * 60 * 5,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const clienteId = watch("cliente_id");

  const clienteDetalleQuery = useQuery({
    queryKey: ["cliente-vehiculos-select", clienteId],
    queryFn: () => clientesApi.obtener(Number(clienteId)),
    enabled: open && Boolean(clienteId),
  });

  useEffect(() => {
    reset({
      cliente_id: defaultClienteId ? String(defaultClienteId) : "",
      vehiculo_id: defaultVehiculoId ? String(defaultVehiculoId) : "",
      fecha_ingreso: new Date().toISOString().slice(0, 10),
      km_entrada: "",
      notas_cliente: "",
      adelanto: "",
      adelanto_metodo: "efectivo",
    });
  }, [defaultClienteId, defaultVehiculoId, open, reset]);

  const adelantoValue = watch("adelanto");
  const hayAdelanto = Boolean(adelantoValue && Number(adelantoValue) > 0);

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      ordenesApi.crear({
        cliente_id: Number(values.cliente_id),
        vehiculo_id: Number(values.vehiculo_id),
        fecha_ingreso: values.fecha_ingreso,
        km_entrada: values.km_entrada ? Number(values.km_entrada) : 0,
        notas_cliente: values.notas_cliente || null,
        adelanto: values.adelanto ? Number(values.adelanto) : 0,
        adelanto_metodo: values.adelanto_metodo || null,
      }),
    onSuccess: ({ data }) => {
      add("Trabajo creado.");
      onCreated(data.data.id);
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const clientes = clientesQuery.data?.data.data.rows ?? [];
  const vehiculos = clienteDetalleQuery.data?.data.data.vehiculos ?? [];

  // Cuando los vehículos del cliente recién registrado cargan, auto-selecciona el vehículo pendiente
  useEffect(() => {
    if (vehiculos.length > 0 && pendingVehicleId.current !== null) {
      setValue("vehiculo_id", String(pendingVehicleId.current));
      pendingVehicleId.current = null;
    }
  }, [vehiculos, setValue]);

  const handleRegistradoExpress = ({ clienteId, vehiculoId }: { clienteId: number; vehiculoId: number }) => {
    // Forzar refetch del selector de clientes para mostrar el recién creado
    queryClient.invalidateQueries({ queryKey: ["clientes", "modal-select"] });
    // Guardar vehiculoId para auto-seleccionar cuando la query de vehículos resuelva
    pendingVehicleId.current = vehiculoId;
    // Seleccionar el cliente — esto dispara clienteDetalleQuery automáticamente
    setValue("cliente_id", String(clienteId), { shouldValidate: true });
  };

  return (
    <>
    <RegistroExpressModal
      open={expressOpen}
      onClose={() => setExpressOpen(false)}
      onRegistrado={handleRegistradoExpress}
      hideCrearOrden
    />
    <Modal open={open} onClose={onClose} title="Nueva orden de trabajo" size="lg">
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-muted">Cliente</label>
            <button
              type="button"
              onClick={() => setExpressOpen(true)}
              className="inline-flex items-center gap-1 text-xs text-primary transition hover:underline"
            >
              <UserPlus size={12} />
              Nuevo cliente
            </button>
          </div>
          <select
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary disabled:opacity-60"
            disabled={clientesQuery.isLoading}
            {...register("cliente_id")}
          >
            <option value="">{clientesQuery.isLoading ? "Cargando clientes..." : "Seleccionar cliente"}</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={String(cliente.id)}>
                {cliente.apellido}, {cliente.nombre}
              </option>
            ))}
          </select>
          {errors.cliente_id ? <span className="text-xs text-red-300">{errors.cliente_id.message}</span> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Vehículo</label>
          <select
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary disabled:opacity-60"
            disabled={!clienteId || clienteDetalleQuery.isLoading}
            {...register("vehiculo_id")}
          >
            <option value="">
              {!clienteId
                ? "Primero elegí un cliente"
                : clienteDetalleQuery.isLoading
                  ? "Cargando vehículos..."
                  : vehiculos.length === 0
                    ? "Este cliente no tiene vehículos"
                    : "Seleccionar vehículo"}
            </option>
            {vehiculos.map((vehiculo) => (
              <option key={vehiculo.id} value={String(vehiculo.id)}>
                {vehiculo.patente} · {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio || ""}
              </option>
            ))}
          </select>
          {errors.vehiculo_id ? <span className="text-xs text-red-300">{errors.vehiculo_id.message}</span> : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Fecha de ingreso" type="date" error={errors.fecha_ingreso?.message} {...register("fecha_ingreso")} />
          <Input label="Km de entrada" type="number" min="0" {...register("km_entrada")} />
        </div>

        <div>
          <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-muted">
            El responsable inicial será el usuario que crea la orden.
          </div>
        </div>

        {/* Adelanto */}
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <p className="mb-3 text-sm font-medium text-text">Adelanto del cliente (opcional)</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Monto del adelanto ($)"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              {...register("adelanto")}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-muted">Método</label>
              <select
                className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary disabled:opacity-60"
                disabled={!hayAdelanto}
                {...register("adelanto_metodo")}
              >
                {METODOS_ADELANTO.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
          {hayAdelanto && (
            <p className="mt-2 text-xs text-primary">
              Se registrará un pago de ${adelantoValue} al crear la orden.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Notas del cliente</label>
          <textarea
            rows={4}
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            placeholder="Motivo del ingreso, síntomas o pedido del cliente."
            {...register("notas_cliente")}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Crear trabajo
          </Button>
        </div>
      </form>
    </Modal>
    </>
  );
}
