import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { empleadosApi, type Empleado } from "../../features/empleados/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";

const schema = z.object({
  rol_id: z.string().min(1, "Selecciona un rol"),
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellido: z.string().min(1, "El apellido es obligatorio"),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido"),
  password: z.string(),
  activo: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface EmpleadoModalProps {
  open: boolean;
  editing: Empleado | null;
  onClose: () => void;
  onSuccess: () => void;
}

const defaultValues: FormData = {
  rol_id: "",
  nombre: "",
  apellido: "",
  telefono: "",
  email: "",
  password: "",
  activo: true,
};

export function EmpleadoModal({ open, editing, onClose, onSuccess }: EmpleadoModalProps) {
  const { add } = useToast();
  const isEditing = Boolean(editing);

  const rolesQuery = useQuery({
    queryKey: ["roles-empleados"],
    queryFn: () => empleadosApi.listarRoles(),
    staleTime: 5 * 60_000,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (editing) {
      reset({
        rol_id: String(editing.rol_id),
        nombre: editing.nombre,
        apellido: editing.apellido,
        telefono: editing.telefono || "",
        email: editing.email,
        password: "",
        activo: Boolean(editing.activo),
      });
      return;
    }

    reset(defaultValues);
  }, [editing, open, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormData) => {
      const payload = {
        rol_id: Number(values.rol_id),
        nombre: values.nombre,
        apellido: values.apellido,
        telefono: values.telefono || null,
        email: values.email,
        ...(isEditing && { activo: values.activo }),
      };

      const response = isEditing
        ? await empleadosApi.actualizar(editing!.id, payload)
        : await empleadosApi.crear({
            ...payload,
            password: values.password,
          });

      if (isEditing && values.password) {
        await empleadosApi.cambiarPassword(editing!.id, values.password);
      }

      return response;
    },
    onSuccess: () => {
      add(isEditing ? "Empleado actualizado." : "Empleado creado.");
      onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const roles = rolesQuery.data?.data.data ?? [];

  const onSubmit = handleSubmit((values) => {
    const password = values.password.trim();
    const needsPassword = !isEditing;
    const hasPassword = password.length > 0;

    if ((needsPassword && password.length < 6) || (!needsPassword && hasPassword && password.length < 6)) {
      setError("password", {
        message: "La contraseña debe tener al menos 6 caracteres.",
      });
      return;
    }

    mutation.mutate({
      ...values,
      password,
    });
  });

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar empleado" : "Nuevo empleado"} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Nombre" error={errors.nombre?.message} {...register("nombre")} />
          <Input label="Apellido" error={errors.apellido?.message} {...register("apellido")} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Rol</label>
            <select
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary disabled:opacity-60"
              disabled={rolesQuery.isLoading}
              {...register("rol_id")}
            >
              <option value="">{rolesQuery.isLoading ? "Cargando roles..." : "Seleccionar rol"}</option>
              {roles.map((rol) => (
                <option key={rol.id} value={String(rol.id)}>
                  {rol.nombre}
                </option>
              ))}
            </select>
            {errors.rol_id ? <span className="text-xs text-red-300">{errors.rol_id.message}</span> : null}
          </div>
          <Input label="Teléfono" {...register("telefono")} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
          <Input
            label={isEditing ? "Nueva contraseña (opcional)" : "Contraseña inicial"}
            type="password"
            error={errors.password?.message}
            {...register("password")}
          />
        </div>

        {isEditing ? (
          <label className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-text">
            <input type="checkbox" className="accent-blue-500" {...register("activo")} />
            Empleado activo
          </label>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEditing ? "Guardar cambios" : "Crear empleado"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
