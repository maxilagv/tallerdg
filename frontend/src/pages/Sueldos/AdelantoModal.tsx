import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import {
  metodoPagoLabels,
  metodoPagoOptions,
  type MetodoPago,
} from "../../features/pagos/api";
import { sueldosApi } from "../../features/sueldos/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { formatMoney } from "../../shared/utils/format";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  periodoId: number;
  empleadoNombre: string;
  saldoDisponible: number;
}

export function AdelantoModal({
  open,
  onClose,
  onSuccess,
  periodoId,
  empleadoNombre,
  saldoDisponible,
}: Props) {
  const { add } = useToast();
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(metodoPagoOptions[0].value);
  const [confirmarSupera, setConfirmarSupera] = useState(false);

  const montoNum = Number(monto) || 0;
  const supera = montoNum > saldoDisponible && saldoDisponible >= 0;

  const mutation = useMutation({
    mutationFn: () =>
      sueldosApi.registrarAdelanto(periodoId, {
        monto: montoNum,
        descripcion: descripcion || undefined,
        metodo_pago: metodoPago,
      }),
    onSuccess: (res) => {
      const { supera_saldo } = res.data.data;
      add(
        supera_saldo
          ? "Adelanto registrado. Supero el saldo del periodo."
          : "Adelanto registrado y descontado del periodo."
      );
      handleClose();
      onSuccess();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const handleClose = () => {
    setMonto("");
    setDescripcion("");
    setMetodoPago(metodoPagoOptions[0].value);
    setConfirmarSupera(false);
    onClose();
  };

  const handleConfirm = () => {
    if (supera && !confirmarSupera) {
      setConfirmarSupera(true);
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal open={open} onClose={handleClose} title={`Adelanto - ${empleadoNombre}`} size="sm">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm">
          <span className="text-text-muted">Saldo disponible del periodo: </span>
          <span className="font-bold text-text">{formatMoney(saldoDisponible)}</span>
        </div>

        <Input
          label="Monto del adelanto"
          type="number"
          min="1"
          step="100"
          value={monto}
          onChange={(e) => {
            setMonto(e.target.value);
            setConfirmarSupera(false);
          }}
          placeholder="Ej: 50000"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Metodo de pago</label>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
          >
            {metodoPagoOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {metodoPagoLabels[option.value]}
              </option>
            ))}
          </select>
        </div>

        {supera && (
          <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-yellow-300" />
            <div className="text-sm">
              <p className="font-medium text-yellow-200">El adelanto supera el saldo disponible</p>
              <p className="mt-0.5 text-yellow-300/80">
                El empleado recibira {formatMoney(montoNum)} pero el saldo disponible es{" "}
                {formatMoney(saldoDisponible)}.
              </p>
              {confirmarSupera && (
                <p className="mt-1.5 font-semibold text-yellow-200">
                  Confirmar de todas formas.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Descripcion (opcional)</label>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Adelanto semanal, urgencia medica..."
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            loading={mutation.isPending}
            disabled={!monto || montoNum <= 0}
            variant={confirmarSupera ? "danger" : "primary"}
          >
            {confirmarSupera ? "Si, registrar igual" : "Registrar adelanto"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
