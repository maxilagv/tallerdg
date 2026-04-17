import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { categoriasApi } from "../../features/categorias/api";
import { serviciosApi, type Servicio } from "../../features/servicios/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";

const schema = z.object({
  categoria_id: z.string().min(1, "Selecciona una categoría"),
  nombre: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
  precio_base: z.string().min(1, "El precio es obligatorio"),
  tiempo_estimado_min: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ServicioModalProps {
  open: boolean;
  onClose: () => void;
  editing: Servicio | null;
  onSuccess: () => void;
}

export function ServicioModal({ open, onClose, editing, onSuccess }: ServicioModalProps) {
  const { add } = useToast();
  const isEditing = Boolean(editing);

  const categoriasQuery = useQuery({
    queryKey: ["categorias-servicio"],
    queryFn: () => categoriasApi.listar("servicio"),
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
        nombre: editing.nombre,
        descripcion: editing.descripcion || "",
        precio_base: String(editing.precio_base ?? 0),
        tiempo_estimado_min: String(editing.tiempo_estimado_min ?? 0),
      });
      return;
    }

    reset({
      categoria_id: "",
      nombre: "",
      descripcion: "",
      precio_base: "0",
      tiempo_estimado_min: "0",
    });
  }, [editing, reset, open]);

  const mutation = useMutation({
    mutationFn: (values: FormData) => {
      const payload = {
        categoria_id: Number(values.categoria_id),
        nombre: values.nombre,
        descripcion: values.descripcion || null,
        precio_base: Number(values.precio_base),
        tiempo_estimado_min: values.tiempo_estimado_min ? Number(values.tiempo_estimado_min) : 0,
      };

      return isEditing ? serviciosApi.actualizar(editing!.id, payload) : serviciosApi.crear(payload);
    },
    onSuccess: () => {
      add(isEditing ? "Servicio actualizado." : "Servicio creado.");
      onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const categorias = categoriasQuery.data?.data.data ?? [];

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar servicio" : "Nuevo servicio"} size="lg">
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
          <Input label="Nombre" error={errors.nombre?.message} {...register("nombre")} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Precio base"
            type="number"
            min="0"
            step="0.01"
            error={errors.precio_base?.message}
            {...register("precio_base")}
          />
          <Input
            label="Tiempo estimado (minutos)"
            type="number"
            min="0"
            error={errors.tiempo_estimado_min?.message}
            {...register("tiempo_estimado_min")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Descripción</label>
          <textarea
            rows={4}
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            placeholder="Detalle breve del servicio, alcance o recomendaciones."
            {...register("descripcion")}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEditing ? "Guardar cambios" : "Crear servicio"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
