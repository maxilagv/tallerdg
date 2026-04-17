import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";
import {
  metodoPagoLabels,
  metodoPagoOptions,
  type MetodoPago,
} from "../../features/pagos/api";
import { sueldosApi, type PeriodoSueldo } from "../../features/sueldos/api";
import { Button } from "../../shared/ui/Button";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { formatDate, formatMoney } from "../../shared/utils/format";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  periodo: PeriodoSueldo;
  empleadoNombre: string;
}

export function LiquidarModal({ open, onClose, onSuccess, periodo, empleadoNombre }: Props) {
  const { add } = useToast();
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(metodoPagoOptions[0].value);

  const adelantos = periodo.total_adelantos ?? 0;
  const saldoRestante = Number(periodo.sueldo_base) - adelantos;

  const handleClose = () => {
    setMetodoPago(metodoPagoOptions[0].value);
    onClose();
  };

  const mutation = useMutation({
    mutationFn: () => sueldosApi.liquidar(periodo.id, { metodo_pago: metodoPago }),
    onSuccess: (res) => {
      const { saldo_pagado } = res.data.data;
      add(
        saldo_pagado > 0
          ? `Periodo liquidado. Se registro un gasto de ${formatMoney(saldo_pagado)}.`
          : "Periodo liquidado. No quedaba saldo pendiente."
      );
      onSuccess();
      handleClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  return (
    <Modal open={open} onClose={handleClose} title={`Liquidar periodo - ${empleadoNombre}`} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Al liquidar, el periodo se cierra y{" "}
          {saldoRestante > 0
            ? `se registra un gasto de ${formatMoney(saldoRestante)} en la categoria "Sueldos".`
            : "no se genera gasto adicional porque ya fue cubierto con adelantos."}
        </p>

        {saldoRestante > 0 && (
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
        )}

        <div className="rounded-xl border border-border bg-surface-2 divide-y divide-border">
          <Row label="Periodo" value={`${formatDate(periodo.fecha_inicio)} -> ${formatDate(periodo.fecha_fin)}`} />
          <Row label="Sueldo del periodo" value={formatMoney(periodo.sueldo_base)} />
          <Row label="Total adelantos" value={`- ${formatMoney(adelantos)}`} tone="red" />
          <Row
            label="Saldo a pagar"
            value={formatMoney(Math.max(0, saldoRestante))}
            tone="green"
            bold
          />
        </div>

        {saldoRestante < 0 && (
          <p className="text-xs text-yellow-300">
            Los adelantos superaron el sueldo del periodo en{" "}
            {formatMoney(Math.abs(saldoRestante))}. Ese excedente no se descuenta del proximo
            periodo automaticamente.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            <CheckCircle size={16} />
            Confirmar liquidacion
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Row({
  label,
  value,
  tone,
  bold,
}: {
  label: string;
  value: string;
  tone?: "red" | "green";
  bold?: boolean;
}) {
  const toneClass =
    tone === "red" ? "text-red-300" : tone === "green" ? "text-green-300" : "text-text";

  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className={`${toneClass} ${bold ? "font-bold text-base" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}
