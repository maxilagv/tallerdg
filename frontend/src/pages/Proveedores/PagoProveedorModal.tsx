import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  proveedoresApi,
  type CuentaCorriente,
  type Proveedor,
} from "../../features/proveedores/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";

const schema = z.object({
  monto: z.coerce.number().positive("El monto debe ser mayor a cero"),
  descripcion: z.string().min(1, "La descripción es obligatoria"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  proveedor: Proveedor;
  cc: CuentaCorriente;
  onSuccess: () => void;
}

export function PagoProveedorModal({
  open,
  onClose,
  proveedor,
  cc,
  onSuccess,
}: Props) {
  const { add } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { monto: undefined, descripcion: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      proveedoresApi.registrarPago(proveedor.id, values),
    onSuccess: () => {
      add("Pago registrado correctamente.");
      reset();
      onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Registrar pago — ${proveedor.nombre}`}
      size="sm"
    >
      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v as FormData))}
        className="space-y-4"
      >
        {/* Saldo actual */}
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <p className="text-xs text-text-muted">Deuda actual con el proveedor</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              Number(cc.saldo) > 0 ? "text-red-400" : "text-green-400"
            }`}
          >
            {formatMoney(cc.saldo)}
          </p>
        </div>

        <Input
          label="Monto a pagar *"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          error={errors.monto?.message}
          {...register("monto")}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">
            Descripción *
          </label>
          <textarea
            rows={2}
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            placeholder="Ej: Pago factura 0001-00045"
            {...register("descripcion")}
          />
          {errors.descripcion && (
            <p className="text-xs text-red-400">{errors.descripcion.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Registrar pago
          </Button>
        </div>
      </form>
    </Modal>
  );
}
