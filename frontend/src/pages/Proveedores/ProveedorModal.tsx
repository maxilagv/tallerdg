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
  activar_cuenta_corriente: z.boolean(),
  saldo_tipo: z.enum(["deuda", "favor"]),
  saldo_monto: z.coerce.number().min(0, "El monto no puede ser negativo"),
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

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      nombre: "",
      cuit: "",
      telefono: "",
      email: "",
      condicion_pago: "",
      notas: "",
      activar_cuenta_corriente: false,
      saldo_tipo: "deuda",
      saldo_monto: 0,
    },
  });

  const activarCuentaCorriente = watch("activar_cuenta_corriente");

  useEffect(() => {
    if (editing) {
      reset({
        nombre:         editing.nombre,
        cuit:           editing.cuit || "",
        telefono:       editing.telefono || "",
        email:          editing.email || "",
        condicion_pago: editing.condicion_pago || "",
        notas:          editing.notas || "",
        activar_cuenta_corriente: false,
        saldo_tipo: "deuda",
        saldo_monto: 0,
      });
    } else {
      reset({
        nombre: "",
        cuit: "",
        telefono: "",
        email: "",
        condicion_pago: "",
        notas: "",
        activar_cuenta_corriente: false,
        saldo_tipo: "deuda",
        saldo_monto: 0,
      });
    }
  }, [editing, open, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormData) => {
      const {
        activar_cuenta_corriente,
        saldo_tipo,
        saldo_monto,
        ...proveedor
      } = values;
      const saldoInicial = saldo_tipo === "favor" ? -saldo_monto : saldo_monto;

      return isEditing
        ? proveedoresApi.actualizar(editing!.id, proveedor)
        : proveedoresApi.crear({
            ...proveedor,
            activar_cuenta_corriente,
            saldo_inicial_cc: activar_cuenta_corriente ? saldoInicial : 0,
          });
    },
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
      <form onSubmit={handleSubmit((v) => mutation.mutate(v as FormData))} className="space-y-4">
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

        {!isEditing ? (
          <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-primary"
                {...register("activar_cuenta_corriente")}
              />
              <span>
                <span className="block font-medium text-text">Crear cuenta corriente</span>
                <span className="text-text-muted">
                  Carga deuda inicial o saldo a favor sin registrar un pago en caja.
                </span>
              </span>
            </label>

            {activarCuentaCorriente ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-muted">Tipo de saldo</label>
                  <select
                    className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
                    {...register("saldo_tipo")}
                  >
                    <option value="deuda">Deuda con proveedor</option>
                    <option value="favor">Saldo a favor</option>
                  </select>
                </div>
                <Input
                  label="Monto inicial"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  error={errors.saldo_monto?.message}
                  {...register("saldo_monto")}
                />
              </div>
            ) : null}
          </div>
        ) : null}

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
