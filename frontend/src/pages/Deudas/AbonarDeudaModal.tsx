import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { deudasApi, type Deuda } from "../../features/deudas/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";

const schema = z.object({
  monto: z.string().min(1, "Ingresá el monto"),
  notas: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  deuda: Deuda | null;
  open: boolean;
  onClose: () => void;
}

export function AbonarDeudaModal({ deuda, open, onClose }: Props) {
  const { add } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      deudasApi.abonar(deuda!.id, Number(values.monto), values.notas || null),
    onSuccess: () => {
      add("Abono registrado.");
      queryClient.invalidateQueries({ queryKey: ["deudas"] });
      queryClient.invalidateQueries({ queryKey: ["deudas-resumen"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-resumen"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-por-dia"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-movimientos-detalle"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-movimientos-mes"] });
      reset();
      onClose();
    },
    onError: (err) => add(getErrorMessage(err), "error"),
  });

  if (!deuda) return null;

  return (
    <Modal open={open} onClose={onClose} title="Registrar abono" size="sm">
      <div className="mb-4 rounded-xl border border-border bg-surface-2 p-3 text-sm">
        <p className="font-medium text-text">{deuda.concepto}</p>
        <p className="mt-1 text-text-muted">
          {deuda.cliente_apellido}, {deuda.cliente_nombre}
        </p>
        <div className="mt-2 flex gap-4 text-xs text-text-muted">
          <span>Total: <strong className="text-text">{formatMoney(deuda.monto_original)}</strong></span>
          <span>Pagado: <strong className="text-green-400">{formatMoney(deuda.monto_pagado)}</strong></span>
          <span>Saldo: <strong className="text-red-400">{formatMoney(deuda.saldo)}</strong></span>
        </div>
      </div>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <Input
          label={`Monto del abono (máx. ${formatMoney(deuda.saldo)})`}
          type="number"
          min="0.01"
          max={deuda.saldo}
          step="0.01"
          {...register("monto")}
          error={errors.monto?.message}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Notas (opcional)</label>
          <textarea
            rows={2}
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            {...register("notas")}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={mutation.isPending}>Registrar abono</Button>
        </div>
      </form>
    </Modal>
  );
}
