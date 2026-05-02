import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { deudasApi, type Deuda, type MetodoPagoDeuda } from "../../features/deudas/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";

const schema = z.object({
  monto: z.string().min(1, "Ingresa el monto").refine((value) => Number(value) > 0, "El monto debe ser mayor a 0"),
  metodo_pago: z.enum(["efectivo", "transferencia", "tarjeta"]),
  incluye_iva: z.boolean().optional(),
  iva_porcentaje: z.string().optional(),
  notas: z.string().optional(),
}).superRefine((values, ctx) => {
  if (!values.incluye_iva) return;
  const iva = Number(values.iva_porcentaje);
  if (!Number.isFinite(iva) || iva < 0 || iva > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["iva_porcentaje"],
      message: "Ingresa un porcentaje entre 0 y 100",
    });
  }
});

type FormData = z.infer<typeof schema>;

const metodoPagoOptions: Array<{ value: MetodoPagoDeuda; label: string }> = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
];

const defaultValues: FormData = {
  monto: "",
  metodo_pago: "efectivo",
  incluye_iva: false,
  iva_porcentaje: "21",
  notas: "",
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

interface Props {
  deuda: Deuda | null;
  open: boolean;
  onClose: () => void;
}

export function AbonarDeudaModal({ deuda, open, onClose }: Props) {
  const { add } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      deudasApi.abonar(deuda!.id, {
        monto: Number(values.monto),
        metodo_pago: values.metodo_pago,
        incluye_iva: Boolean(values.incluye_iva),
        iva_porcentaje: values.incluye_iva ? Number(values.iva_porcentaje || 0) : 0,
        notas: values.notas || null,
      }),
    onSuccess: () => {
      add("Abono registrado.");
      queryClient.invalidateQueries({ queryKey: ["deudas"] });
      queryClient.invalidateQueries({ queryKey: ["deudas-resumen"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-resumen"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-por-dia"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-movimientos-detalle"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas-movimientos-mes"] });
      reset(defaultValues);
      onClose();
    },
    onError: (err) => add(getErrorMessage(err), "error"),
  });

  if (!deuda) return null;

  const montoBase = Number(watch("monto")) || 0;
  const incluyeIva = Boolean(watch("incluye_iva"));
  const ivaPorcentaje = incluyeIva ? Number(watch("iva_porcentaje") || 0) : 0;
  const ivaMonto = incluyeIva ? roundMoney(montoBase * (ivaPorcentaje / 100)) : 0;
  const totalCobrar = roundMoney(montoBase + ivaMonto);

  return (
    <Modal open={open} onClose={onClose} title="Registrar abono" size="md">
      <div className="mb-4 rounded-xl border border-border bg-surface-2 p-3 text-sm">
        <p className="font-medium text-text">{deuda.concepto}</p>
        <p className="mt-1 text-text-muted">
          {deuda.cliente_apellido}, {deuda.cliente_nombre}
        </p>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-muted">
          <span>Total: <strong className="text-text">{formatMoney(deuda.monto_original)}</strong></span>
          <span>Pagado: <strong className="text-green-400">{formatMoney(deuda.monto_pagado)}</strong></span>
          <span>Saldo: <strong className="text-red-400">{formatMoney(deuda.saldo)}</strong></span>
        </div>
      </div>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <Input
          label={`Monto base del abono (max. ${formatMoney(deuda.saldo)})`}
          type="number"
          min="0.01"
          max={deuda.saldo}
          step="0.01"
          {...register("monto")}
          error={errors.monto?.message}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Metodo de pago</label>
          <select
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            {...register("metodo_pago")}
          >
            {metodoPagoOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {errors.metodo_pago ? <span className="text-xs text-red-300">{errors.metodo_pago.message}</span> : null}
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-border bg-surface-3 accent-primary"
            {...register("incluye_iva")}
          />
          <span className="text-sm">
            <span className="block font-medium text-text">Agregar IVA / factura</span>
            <span className="text-xs text-text-muted">Suma el porcentaje al total cobrado.</span>
          </span>
        </label>

        {incluyeIva ? (
          <Input
            label="IVA (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            {...register("iva_porcentaje")}
            error={errors.iva_porcentaje?.message}
          />
        ) : null}

        <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-surface-2 p-3 text-xs">
          <div>
            <p className="text-text-muted">Base</p>
            <p className="mt-1 font-semibold text-text">{formatMoney(montoBase)}</p>
          </div>
          <div>
            <p className="text-text-muted">IVA</p>
            <p className="mt-1 font-semibold text-yellow-300">{formatMoney(ivaMonto)}</p>
          </div>
          <div>
            <p className="text-text-muted">Total</p>
            <p className="mt-1 font-semibold text-green-300">{formatMoney(totalCobrar)}</p>
          </div>
        </div>

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
