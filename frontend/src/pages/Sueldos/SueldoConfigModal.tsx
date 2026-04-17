import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { sueldosApi, type PeriodoPago, type SalarioConfig } from "../../features/sueldos/api";
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
  empleadoId: number;
  empleadoNombre: string;
  configActual: SalarioConfig | null;
}

const PERIODOS: { value: PeriodoPago; label: string }[] = [
  { value: "semana", label: "Semanal (cada 7 dias)" },
  { value: "quincena", label: "Quincenal (cada 15 dias)" },
  { value: "mes", label: "Mensual (fin de mes)" },
];

function calcularMontoPeriodo(total: number, periodo: PeriodoPago) {
  if (periodo === "semana") return total / 4;
  if (periodo === "quincena") return total / 2;
  return total;
}

export function SueldoConfigModal({
  open,
  onClose,
  onSuccess,
  empleadoId,
  empleadoNombre,
  configActual,
}: Props) {
  const { add } = useToast();
  const [sueldoBase, setSueldoBase] = useState("");
  const [periodoPago, setPeriodoPago] = useState<PeriodoPago>("mes");

  useEffect(() => {
    if (open) {
      setSueldoBase(configActual ? String(configActual.sueldo_base) : "");
      setPeriodoPago(configActual?.periodo_pago ?? "mes");
    }
  }, [open, configActual]);

  const sueldoTotal = Number(sueldoBase) || 0;
  const montoPeriodo = calcularMontoPeriodo(sueldoTotal, periodoPago);

  const mutation = useMutation({
    mutationFn: () =>
      sueldosApi.upsertConfig(empleadoId, {
        sueldo_base: sueldoTotal,
        periodo_pago: periodoPago,
      }),
    onSuccess: () => {
      add("Sueldo configurado correctamente.");
      onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  return (
    <Modal open={open} onClose={onClose} title={`Configurar sueldo - ${empleadoNombre}`} size="sm">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-muted">
          Carga el sueldo total acordado. El sistema divide automaticamente lo que corresponde pagar
          en cada periodo.
        </div>

        <Input
          label="Sueldo total"
          type="number"
          min="0"
          step="100"
          value={sueldoBase}
          onChange={(e) => setSueldoBase(e.target.value)}
          placeholder="Ej: 400000"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Periodo de pago</label>
          <div className="space-y-2">
            {PERIODOS.map((periodo) => (
              <label
                key={periodo.value}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 transition hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input
                  type="radio"
                  name="periodo_pago"
                  value={periodo.value}
                  checked={periodoPago === periodo.value}
                  onChange={() => setPeriodoPago(periodo.value)}
                  className="accent-primary"
                />
                <span className="text-sm text-text">{periodo.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm">
          <p className="text-text-muted">Monto a pagar por periodo</p>
          <p className="mt-1 text-lg font-bold text-text">{formatMoney(montoPeriodo)}</p>
          <p className="mt-1 text-xs text-text-muted">
            Semanal divide en 4 partes, quincenal en 2 y mensual toma el total completo.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!sueldoBase || sueldoTotal < 0}
          >
            Guardar configuracion
          </Button>
        </div>
      </div>
    </Modal>
  );
}
