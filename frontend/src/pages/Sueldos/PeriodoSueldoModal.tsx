import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { sueldosApi, type PeriodoSueldo } from "../../features/sueldos/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  periodo: PeriodoSueldo;
  empleadoNombre: string;
}

function dateInputValue(value: string) {
  return String(value || "").slice(0, 10);
}

export function PeriodoSueldoModal({
  open,
  onClose,
  onSuccess,
  periodo,
  empleadoNombre,
}: Props) {
  const { add } = useToast();
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [sueldoPeriodo, setSueldoPeriodo] = useState("");

  useEffect(() => {
    if (!open) return;
    setFechaInicio(dateInputValue(periodo.fecha_inicio));
    setFechaFin(dateInputValue(periodo.fecha_fin));
    setSueldoPeriodo(String(periodo.sueldo_base ?? ""));
  }, [open, periodo]);

  const sueldo = Number(sueldoPeriodo) || 0;
  const fechaInvalida = Boolean(fechaInicio && fechaFin && fechaFin < fechaInicio);

  const mutation = useMutation({
    mutationFn: () =>
      sueldosApi.actualizarPeriodo(periodo.id, {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        sueldo_base: sueldo,
      }),
    onSuccess: () => {
      add("Periodo actualizado.");
      onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  return (
    <Modal open={open} onClose={onClose} title={`Editar periodo - ${empleadoNombre}`} size="sm">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Fecha de inicio"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
          <Input
            label="Fecha de cierre"
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            error={fechaInvalida ? "La fecha de cierre no puede ser anterior al inicio." : undefined}
          />
        </div>

        <Input
          label="Monto del periodo"
          type="number"
          min="0"
          step="0.01"
          value={sueldoPeriodo}
          onChange={(e) => setSueldoPeriodo(e.target.value)}
        />

        <p className="text-xs text-text-muted">
          Este cambio ajusta solo el periodo abierto. La configuracion de sueldo se maneja desde Configurar.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!fechaInicio || !fechaFin || fechaInvalida || sueldo < 0}
          >
            Guardar periodo
          </Button>
        </div>
      </div>
    </Modal>
  );
}
