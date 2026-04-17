import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { proveedoresApi, type Proveedor } from "../../features/proveedores/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";

const schema = z.object({
  nombre:        z.string().min(1, "El nombre del proveedor es obligatorio"),
  cuit:          z.string().optional(),
  telefono:      z.string().optional(),
  email:         z.string().email("Email inválido").optional().or(z.literal("")),
  condicion_pago:z.string().optional(),
  notas:         z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  editing: Proveedor | null;
  onSuccess: () => void;
}

export function ProveedorModal({ open, onClose, editing, onSuccess }: Props) {
  const { add } = useToast();
  const isEditing = Boolean(editing);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (editing) {
      reset({
        nombre:         editing.nombre,
        cuit:           editing.cuit || "",
        telefono:       editing.telefono || "",
        email:          editing.email || "",
        condicion_pago: editing.condicion_pago || "",
        notas:          editing.notas || "",
      });
    } else {
      reset({ nombre: "", cuit: "", telefono: "", email: "", condicion_pago: "", notas: "" });
    }
  }, [editing, open, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      isEditing
        ? proveedoresApi.actualizar(editing!.id, values)
        : proveedoresApi.crear(values),
    onSuccess: () => {
      add(isEditing ? "Proveedor actualizado." : "Proveedor creado.");
      onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar proveedor" : "Nuevo proveedor"}
      size="md"
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <Input label="Nombre *" error={errors.nombre?.message} {...register("nombre")} />

        <div className="grid gap-3 md:grid-cols-2">
          <Input label="CUIT" placeholder="20-12345678-9" {...register("cuit")} />
          <Input label="Teléfono" type="tel" {...register("telefono")} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
          <Input
            label="Condición de pago"
            placeholder="Contado, 30 días..."
            {...register("condicion_pago")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Notas</label>
          <textarea
            rows={3}
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            placeholder="Observaciones adicionales del proveedor..."
            {...register("notas")}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEditing ? "Guardar cambios" : "Crear proveedor"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
