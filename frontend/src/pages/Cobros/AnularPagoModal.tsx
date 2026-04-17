import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { pagosApi, metodoPagoLabels, type Pago } from "../../features/pagos/api";
import { Button } from "../../shared/ui/Button";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { formatDateTime, formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";

interface AnularPagoModalProps {
  open: boolean;
  pago: Pago | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export function AnularPagoModal({
  open,
  pago,
  onClose,
  onSuccess,
}: AnularPagoModalProps) {
  const { add } = useToast();
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      return;
    }

    setMotivo("");
    setError(undefined);
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!pago) {
        throw new Error("No se encontro el cobro a anular.");
      }
      await pagosApi.anular(pago.id, motivo.trim());
    },
    onSuccess: async () => {
      add("Cobro anulado.");
      await onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const handleSubmit = () => {
    if (motivo.trim().length < 3) {
      setError("Describe brevemente el motivo de la anulacion.");
      return;
    }

    setError(undefined);
    mutation.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="Anular cobro" size="lg">
      {pago ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm">
            <p className="font-medium text-red-200">
              Vas a anular el cobro {formatMoney(pago.monto)} de la orden {pago.orden_numero}.
            </p>
            <p className="mt-2 text-text-muted">
              Registrado el {formatDateTime(pago.created_at)} por {pago.empleado_nombre || "usuario"}
              {" · "}
              {metodoPagoLabels[pago.metodo]}.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Motivo de anulacion</label>
            <textarea
              rows={4}
              value={motivo}
              onChange={(event) => {
                setMotivo(event.target.value);
                if (error) {
                  setError(undefined);
                }
              }}
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              placeholder="Ejemplo: cobro duplicado, monto mal cargado, transferencia rechazada"
            />
            {error ? <span className="text-xs text-red-300">{error}</span> : null}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleSubmit} loading={mutation.isPending}>
              Anular cobro
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
