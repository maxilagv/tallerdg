import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { pagosApi, metodoPagoLabels, metodoPagoOptions } from "../../features/pagos/api";
import type { Orden } from "../../features/ordenes/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";

interface RegistrarPagoModalProps {
  open: boolean;
  orden: Orden | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export function RegistrarPagoModal({
  open,
  orden,
  onClose,
  onSuccess,
}: RegistrarPagoModalProps) {
  const { add } = useToast();
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState(metodoPagoOptions[0].value);
  const [referencia, setReferencia] = useState("");
  const [notas, setNotas] = useState("");
  const [errorMonto, setErrorMonto] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open || !orden) {
      return;
    }

    const saldo = Number(orden.saldo_pendiente || 0);
    const esAdelanto = orden.estado !== "cerrada";

    setMonto(esAdelanto ? (saldo > 0 ? String(saldo) : "") : String(saldo));
    setMetodo(metodoPagoOptions[0].value);
    setReferencia("");
    setNotas("");
    setErrorMonto(undefined);
  }, [open, orden]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!orden) {
        throw new Error("No se encontro la orden para registrar el cobro.");
      }

      await pagosApi.crear({
        orden_id: orden.id,
        monto: Number(monto || 0),
        metodo,
        referencia: referencia.trim() || null,
        notas: notas.trim() || null,
      });
    },
    onSuccess: async () => {
      add("Cobro registrado.");
      await onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const saldoPendiente = Number(orden?.saldo_pendiente || 0);
  const esAdelanto = orden ? orden.estado !== "cerrada" : false;

  const handleSubmit = () => {
    if (!orden) {
      return;
    }

    const parsedMonto = Number(monto || 0);

    if (!Number.isFinite(parsedMonto) || parsedMonto <= 0) {
      setErrorMonto("Ingresa un monto mayor a 0.");
      return;
    }

    if (orden.estado === "cerrada" && parsedMonto > Number(orden.saldo_pendiente || 0)) {
      setErrorMonto("El cobro no puede superar el saldo pendiente.");
      return;
    }

    setErrorMonto(undefined);
    mutation.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title={esAdelanto ? "Registrar adelanto" : "Registrar cobro"} size="lg">
      {orden ? (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-border bg-surface-2 p-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">Orden</p>
              <p className="mt-1 font-mono text-sm font-semibold text-primary">{orden.numero}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">Total</p>
              <p className="mt-1 text-sm font-semibold text-text">{formatMoney(orden.total)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">Saldo pendiente</p>
              <p className="mt-1 text-sm font-semibold text-red-300">{formatMoney(saldoPendiente)}</p>
            </div>
          </div>

          {esAdelanto ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-text">
              Este pago se registrara como adelanto dentro de la orden y descontara el saldo pendiente.
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label={esAdelanto ? "Monto del adelanto" : "Monto"}
              type="number"
              min="0"
              max={esAdelanto ? undefined : saldoPendiente}
              step="0.01"
              value={monto}
              onChange={(event) => {
                setMonto(event.target.value);
                if (errorMonto) {
                  setErrorMonto(undefined);
                }
              }}
              error={errorMonto}
              hint={
                esAdelanto
                  ? "Puedes registrar un adelanto aunque el total final de la orden todavia no este definido."
                  : `Maximo permitido: ${formatMoney(saldoPendiente)}`
              }
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-muted">Metodo</label>
              <select
                value={metodo}
                onChange={(event) => setMetodo(event.target.value as typeof metodo)}
                className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              >
                {metodoPagoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label={`Referencia (${metodoPagoLabels[metodo]})`}
            value={referencia}
            onChange={(event) => setReferencia(event.target.value)}
            placeholder="Numero de transferencia, voucher, cheque, etc."
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Notas internas</label>
            <textarea
              rows={4}
              value={notas}
              onChange={(event) => setNotas(event.target.value)}
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              placeholder="Observaciones del cobro"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={mutation.isPending}>
              {esAdelanto ? "Registrar adelanto" : "Registrar cobro"}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
