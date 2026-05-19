import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { sueldosApi, type TipoDescuentoSueldo } from "../../features/sueldos/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { formatMoney, toLocalDateInputValue } from "../../shared/utils/format";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  periodoId: number;
  empleadoNombre: string;
  sueldoPeriodo: number;
  fechaInicio: string;
  fechaFin: string;
  saldoDisponible: number;
}

function diasInclusivos(inicio: string, fin: string) {
  const start = new Date(`${inicio.slice(0, 10)}T12:00:00`);
  const end = new Date(`${fin.slice(0, 10)}T12:00:00`);
  return Math.max(Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1, 1);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function DescuentoModal({
  open,
  onClose,
  onSuccess,
  periodoId,
  empleadoNombre,
  sueldoPeriodo,
  fechaInicio,
  fechaFin,
  saldoDisponible,
}: Props) {
  const { add } = useToast();
  const [tipo, setTipo] = useState<TipoDescuentoSueldo>("falta");
  const [fecha, setFecha] = useState(toLocalDateInputValue());
  const [cantidad, setCantidad] = useState("1");
  const [horasJornada, setHorasJornada] = useState("8");
  const [motivo, setMotivo] = useState("");

  const cantidadNum = Number(cantidad.replace(",", ".")) || 0;
  const horasJornadaNum = Number(horasJornada.replace(",", ".")) || 0;
  const valorDia = useMemo(
    () => roundMoney(Number(sueldoPeriodo) / diasInclusivos(fechaInicio, fechaFin)),
    [fechaFin, fechaInicio, sueldoPeriodo]
  );
  const valorHora = tipo === "tardanza" && horasJornadaNum > 0
    ? roundMoney(valorDia / horasJornadaNum)
    : null;
  const montoCalculado = tipo === "falta"
    ? roundMoney(valorDia * cantidadNum)
    : roundMoney((valorHora || 0) * cantidadNum);
  const superaSaldo = montoCalculado > saldoDisponible;

  const mutation = useMutation({
    mutationFn: () =>
      sueldosApi.registrarDescuento(periodoId, {
        tipo,
        fecha,
        cantidad: cantidadNum,
        horas_jornada: tipo === "tardanza" ? horasJornadaNum : null,
        motivo: motivo.trim() || null,
      }),
    onSuccess: (res) => {
      add(`Descuento aplicado por ${formatMoney(res.data.data.monto_calculado)}.`);
      handleClose();
      onSuccess();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const handleClose = () => {
    setTipo("falta");
    setFecha(toLocalDateInputValue());
    setCantidad("1");
    setHorasJornada("8");
    setMotivo("");
    onClose();
  };

  const isValid =
    cantidadNum > 0 &&
    !!fecha &&
    (tipo === "falta" || horasJornadaNum > 0) &&
    montoCalculado > 0;

  return (
    <Modal open={open} onClose={handleClose} title={`Descuento - ${empleadoNombre}`} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "falta", label: "Falta" },
            { value: "tardanza", label: "Tardanza" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setTipo(item.value as TipoDescuentoSueldo);
                setCantidad(item.value === "falta" ? "1" : "1");
              }}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                tipo === item.value
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-surface-3 text-text-muted hover:text-text"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <Input
            label={tipo === "falta" ? "Dias a descontar" : "Horas a descontar"}
            type="number"
            min="0.01"
            step={tipo === "falta" ? "0.5" : "0.25"}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder={tipo === "falta" ? "Ej: 1" : "Ej: 1.5"}
          />
        </div>

        {tipo === "tardanza" && (
          <Input
            label="Horas de la jornada"
            type="number"
            min="0.01"
            step="0.25"
            value={horasJornada}
            onChange={(e) => setHorasJornada(e.target.value)}
            placeholder="Ej: 8"
          />
        )}

        <div className="rounded-xl border border-border bg-surface-2 divide-y divide-border">
          <Row label="Valor del dia" value={formatMoney(valorDia)} />
          {tipo === "tardanza" && <Row label="Valor por hora" value={formatMoney(valorHora || 0)} />}
          <Row label="Saldo actual" value={formatMoney(Math.max(0, saldoDisponible))} />
          <Row label="Descuento a aplicar" value={`- ${formatMoney(montoCalculado)}`} tone="red" bold />
        </div>

        {superaSaldo && (
          <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-yellow-300" />
            <p className="text-sm text-yellow-200">
              El descuento supera el saldo disponible del periodo. Se aplicara igual y el saldo a cobrar quedara en cero.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Motivo (opcional)</label>
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder='Ej: "Falto sin aviso", "Llego 2 horas tarde"'
            maxLength={500}
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!isValid}>
            Aplicar descuento
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
  tone?: "red";
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className={`${tone === "red" ? "text-red-300" : "text-text"} ${bold ? "font-bold text-base" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}
