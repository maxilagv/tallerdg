import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { proveedoresApi, type Proveedor } from "../../features/proveedores/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";

const schema = z.object({
  saldo_tipo: z.enum(["deuda", "favor"]),
  saldo_monto: z.coerce.number().min(0, "El monto no puede ser negativo").default(0),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  proveedor: Proveedor;
  onSuccess: () => void;
}

export function ActivarCCModal({ open, onClose, proveedor, onSuccess }: Props) {
  const { add } = useToast();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { saldo_tipo: "deuda", saldo_monto: 0 },
  });

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      proveedoresApi.activarCuentaCorriente(proveedor.id, {
        saldo_inicial:
          values.saldo_tipo === "favor" ? -values.saldo_monto : values.saldo_monto,
      }),
    onSuccess: () => {
      add("Cuenta corriente activada.");
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
      title={`Activar cuenta corriente — ${proveedor.nombre}`}
      size="sm"
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v as FormData))} className="space-y-4">
        <p className="text-sm text-text-muted">
          Al activar la cuenta corriente, cada compra que registres a este
          proveedor generara automaticamente una deuda. Podes cargar deuda
          previa o saldo a favor inicial.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
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
            placeholder="0"
            error={errors.saldo_monto?.message}
            {...register("saldo_monto")}
          />
        </div>

        <p className="text-xs text-text-muted">
          Si dejás en 0, la cuenta arranca desde cero.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Activar cuenta corriente
          </Button>
        </div>
      </form>
    </Modal>
  );
}
