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
  saldo_inicial: z.coerce.number().default(0),
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
    resolver: zodResolver(schema),
    defaultValues: { saldo_inicial: 0 },
  });

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      proveedoresApi.activarCuentaCorriente(proveedor.id, values),
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
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <p className="text-sm text-text-muted">
          Al activar la cuenta corriente, cada compra que registres a este
          proveedor generará automáticamente una deuda. Podés cargar un saldo
          inicial si ya existía deuda previa.
        </p>

        <Input
          label="Saldo inicial (deuda preexistente)"
          type="number"
          step="0.01"
          min="0"
          placeholder="0"
          error={errors.saldo_inicial?.message}
          {...register("saldo_inicial")}
        />

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
