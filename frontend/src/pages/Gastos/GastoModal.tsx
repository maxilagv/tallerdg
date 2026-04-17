import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { empleadosApi } from "../../features/empleados/api";
import { gastosApi, type Gasto } from "../../features/gastos/api";
import { metodoPagoLabels, metodoPagoOptions } from "../../features/pagos/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";

const schema = z.object({
  categoria_id: z.string().min(1, "Selecciona una categoría"),
  descripcion: z.string().min(1, "La descripción es obligatoria"),
  monto: z.string().min(1, "El monto es obligatorio"),
  metodo_pago: z.string().min(1, "Selecciona el metodo de pago"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  referencia_empleado_id: z.string().optional(),
  notas: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface GastoModalProps {
  open: boolean;
  editing: Gasto | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function GastoModal({ open, editing, onClose, onSuccess }: GastoModalProps) {
  const { add } = useToast();
  const isEditing = Boolean(editing);

  const categoriasQuery = useQuery({
    queryKey: ["gastos-categorias"],
    queryFn: () => gastosApi.listarCategorias(),
    staleTime: 5 * 60_000,
  });

  const empleadosQuery = useQuery({
    queryKey: ["empleados-select-gastos"],
    queryFn: () => empleadosApi.listar({ page: 1, limit: 100 }),
    staleTime: 5 * 60_000,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (editing) {
      reset({
        categoria_id: String(editing.categoria_id),
        descripcion: editing.descripcion,
        monto: String(editing.monto),
        metodo_pago: editing.metodo_pago || "",
        fecha: String(editing.fecha).slice(0, 10),
        referencia_empleado_id: editing.referencia_empleado_id ? String(editing.referencia_empleado_id) : "",
        notas: editing.notas || "",
      });
      return;
    }

    const hoy = new Date();
    const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    reset({
      categoria_id: "",
      descripcion: "",
      monto: "",
      metodo_pago: "",
      fecha: fechaHoy,
      referencia_empleado_id: "",
      notas: "",
    });
  }, [editing, open, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormData) => {
      const payload = {
        categoria_id: Number(values.categoria_id),
        descripcion: values.descripcion,
        monto: Number(values.monto),
        metodo_pago: values.metodo_pago,
        fecha: values.fecha,
        referencia_empleado_id: values.referencia_empleado_id ? Number(values.referencia_empleado_id) : null,
        notas: values.notas || null,
      };

      return isEditing ? gastosApi.actualizar(editing!.id, payload) : gastosApi.crear(payload);
    },
    onSuccess: () => {
      add(isEditing ? "Gasto actualizado." : "Gasto registrado.");
      onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const categorias = categoriasQuery.data?.data.data ?? [];
  const empleados = empleadosQuery.data?.data.data.rows ?? [];

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar gasto" : "Nuevo gasto"} size="lg">
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Categoría</label>
            <select
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary disabled:opacity-60"
              disabled={categoriasQuery.isLoading}
              {...register("categoria_id")}
            >
              <option value="">{categoriasQuery.isLoading ? "Cargando categorías..." : "Seleccionar categoría"}</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={String(categoria.id)}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
            {errors.categoria_id ? <span className="text-xs text-red-300">{errors.categoria_id.message}</span> : null}
          </div>
          <Input label="Fecha" type="date" error={errors.fecha?.message} {...register("fecha")} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Descripción" error={errors.descripcion?.message} {...register("descripcion")} />
          <Input label="Monto" type="number" min="0" step="0.01" error={errors.monto?.message} {...register("monto")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Metodo de pago</label>
          <select
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            {...register("metodo_pago")}
          >
            <option value="">Seleccionar metodo</option>
            {metodoPagoOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {metodoPagoLabels[option.value]}
              </option>
            ))}
          </select>
          {errors.metodo_pago ? <span className="text-xs text-red-300">{errors.metodo_pago.message}</span> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Empleado relacionado (opcional)</label>
          <select
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary disabled:opacity-60"
            disabled={empleadosQuery.isLoading}
            {...register("referencia_empleado_id")}
          >
            <option value="">{empleadosQuery.isLoading ? "Cargando empleados..." : "Sin empleado relacionado"}</option>
            {empleados.map((empleado) => (
              <option key={empleado.id} value={String(empleado.id)}>
                {empleado.nombre} {empleado.apellido}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Notas</label>
          <textarea
            rows={3}
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            {...register("notas")}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEditing ? "Guardar cambios" : "Registrar gasto"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
