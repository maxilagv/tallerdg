import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { clientesApi, type Cliente } from "../../features/clientes/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";

const schema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellido: z.string().min(1, "El apellido es obligatorio"),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  direccion: z.string().optional(),
  notas: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ClienteModalProps {
  open: boolean;
  onClose: () => void;
  editing: Cliente | null;
  onSuccess: () => void;
}

export function ClienteModal({ open, onClose, editing, onSuccess }: ClienteModalProps) {
  const { add } = useToast();
  const isEditing = Boolean(editing);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (editing) {
      reset({
        nombre: editing.nombre,
        apellido: editing.apellido,
        telefono: editing.telefono || "",
        email: editing.email || "",
        direccion: editing.direccion || "",
        notas: editing.notas || "",
      });
    } else {
      reset({
        nombre: "",
        apellido: "",
        telefono: "",
        email: "",
        direccion: "",
        notas: "",
      });
    }
  }, [editing, reset]);

  const mutation = useMutation({
    mutationFn: (payload: FormData) =>
      isEditing ? clientesApi.actualizar(editing!.id, payload) : clientesApi.crear(payload),
    onSuccess: () => {
      add(isEditing ? "Cliente actualizado." : "Cliente creado.");
      onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar cliente" : "Nuevo cliente"}>
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Nombre" error={errors.nombre?.message} {...register("nombre")} />
          <Input label="Apellido" error={errors.apellido?.message} {...register("apellido")} />
        </div>
        <Input label="Teléfono" {...register("telefono")} />
        <Input label="Email" error={errors.email?.message} {...register("email")} />
        <Input label="Dirección" {...register("direccion")} />
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
            {isEditing ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
