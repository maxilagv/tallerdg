import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { sueldosApi, type DescuentoSueldo } from "../../features/sueldos/api";
import { Button } from "../../shared/ui/Button";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { formatDate, formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";

interface Props {
  open: boolean;
  descuento: DescuentoSueldo | null;
  empleadoNombre: string;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export function AnularDescuentoModal({
  open,
  descuento,
  empleadoNombre,
  onClose,
  onSuccess,
}: Props) {
  const { add } = useToast();
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setMotivo("");
    setError(undefined);
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!descuento) {
        throw new Error("No se encontro el descuento a anular.");
      }
      await sueldosApi.anularDescuento(descuento.id, motivo.trim());
    },
    onSuccess: async () => {
      add("Descuento anulado.");
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
    <Modal open={open} onClose={onClose} title="Anular descuento" size="lg">
      {descuento ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm">
            <p className="font-medium text-red-200">
              Vas a anular el descuento de {formatMoney(descuento.monto)} de {empleadoNombre}.
            </p>
            <p className="mt-2 text-text-muted">
              {descuento.tipo === "falta" ? "Falta" : "Tardanza"} del {formatDate(descuento.fecha)}.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Motivo de anulacion</label>
            <textarea
              rows={4}
              value={motivo}
              onChange={(event) => {
                setMotivo(event.target.value);
                if (error) setError(undefined);
              }}
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              placeholder="Ejemplo: descuento duplicado, empleado justifico la falta, carga incorrecta"
            />
            {error ? <span className="text-xs text-red-300">{error}</span> : null}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleSubmit} loading={mutation.isPending}>
              Anular descuento
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
