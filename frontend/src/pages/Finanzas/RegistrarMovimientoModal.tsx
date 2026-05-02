import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine, ChevronDown, ChevronUp } from "lucide-react";
import { finanzasApi, type MovimientoTitularPayload, type TipoMovimientoTitular } from "../../features/finanzas/api";
import { Modal } from "../../shared/ui/Modal";
import { Button } from "../../shared/ui/Button";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";

// ── Helpers ───────────────────────────────────────────────────────────────────

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const STORAGE_KEY = "caja_conceptos_v1";

function getConceptosSugeridos(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function guardarConcepto(concepto: string) {
  const prev = getConceptosSugeridos().filter((c) => c !== concepto);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([concepto, ...prev].slice(0, 5)));
}

// ── Tipos del selector ────────────────────────────────────────────────────────

const TIPOS: { value: TipoMovimientoTitular; label: string; Icon: React.ElementType; sub: string; bg: string }[] = [
  {
    value: "aporte_titular",
    label: "Pusiste plata en caja",
    Icon:  ArrowDownToLine,
    sub:   "Pusiste plata de tu bolsillo en la caja (repusiste efectivo, pagaste algo de tu cuenta, etc.)",
    bg:    "border-violet-500/40 bg-violet-500/10",
  },
  {
    value: "retiro_titular",
    label: "Sacaste plata de caja",
    Icon:  ArrowUpFromLine,
    sub:   "Sacaste plata de la caja para uso personal o para pagar algo por fuera del taller",
    bg:    "border-purple-500/40 bg-purple-500/10",
  },
];

// ── Componente ────────────────────────────────────────────────────────────────

interface Props {
  open:     boolean;
  onClose:  () => void;
  /** Si se pasa un movimiento, el modal abre en modo edición */
  movimiento?: { id: number; tipo: TipoMovimientoTitular; monto: number; concepto: string; referencia: string | null; fecha: string; notas: string | null } | null;
}

export function RegistrarMovimientoModal({ open, onClose, movimiento }: Props) {
  const qc     = useQueryClient();
  const { add } = useToast();
  const esEdicion = !!movimiento;

  const [tipo,       setTipo]       = useState<TipoMovimientoTitular>(movimiento?.tipo ?? "aporte_titular");
  const [monto,      setMonto]      = useState(movimiento ? String(movimiento.monto) : "");
  const [concepto,   setConcepto]   = useState(movimiento?.concepto ?? "");
  const [referencia, setReferencia] = useState(movimiento?.referencia ?? "");
  const [fecha,      setFecha]      = useState(movimiento?.fecha?.slice(0, 10) ?? today());
  const [notas,      setNotas]      = useState(movimiento?.notas ?? "");

  // Campos opcionales colapsados por defecto; se abren automáticamente en edición si tienen datos
  const [showDetails, setShowDetails] = useState(false);

  // Conceptos sugeridos del historial local
  const [sugeridos, setSugeridos] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setSugeridos(getConceptosSugeridos());
      setShowDetails(!!(movimiento?.referencia || movimiento?.notas));
    }
  }, [open, movimiento]);

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["finanzas-resumen"] });
    qc.invalidateQueries({ queryKey: ["finanzas-movimientos-detalle"] });
    qc.invalidateQueries({ queryKey: ["finanzas-movimientos-titular"] });
    qc.invalidateQueries({ queryKey: ["finanzas-analisis"] });
    qc.invalidateQueries({ queryKey: ["finanzas-movimientos-mes"] });
  };

  const crear = useMutation({
    mutationFn: (payload: MovimientoTitularPayload) => finanzasApi.crearMovimientoTitular(payload),
    onSuccess: () => { invalidar(); add("Movimiento registrado.", "success"); onClose(); },
    onError:   (err) => add(getErrorMessage(err), "error"),
  });

  const editar = useMutation({
    mutationFn: (payload: Partial<MovimientoTitularPayload>) =>
      finanzasApi.actualizarMovimientoTitular(movimiento!.id, payload),
    onSuccess: () => { invalidar(); add("Movimiento actualizado.", "success"); onClose(); },
    onError:   (err) => add(getErrorMessage(err), "error"),
  });

  const isLoading = crear.isPending || editar.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(monto.replace(",", "."));
    if (!concepto.trim()) { add("El concepto es obligatorio.", "error"); return; }
    if (isNaN(montoNum) || montoNum <= 0) { add("El monto debe ser mayor que cero.", "error"); return; }

    const payload: MovimientoTitularPayload = {
      tipo,
      monto:      montoNum,
      concepto:   concepto.trim(),
      referencia: referencia.trim() || null,
      fecha,
      notas:      notas.trim() || null,
    };

    guardarConcepto(concepto.trim());

    if (esEdicion) editar.mutate(payload);
    else           crear.mutate(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={esEdicion ? "Editar movimiento" : "Registrar movimiento de caja"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Selector de tipo */}
        {!esEdicion && (
          <div>
            <label className="mb-2 block text-xs font-medium text-text-muted">Tipo de movimiento</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TIPOS.map(({ value, label, Icon, sub, bg }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTipo(value)}
                  className={`rounded-xl border p-3 text-left transition ${tipo === value ? bg : "border-border bg-surface-2 hover:bg-surface-3"}`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Icon size={14} className={tipo === value ? "text-violet-300" : "text-text-muted"} />
                    <span className={`text-sm font-semibold ${tipo === value ? "text-violet-200" : "text-text"}`}>{label}</span>
                  </div>
                  <p className="text-xs text-text-muted leading-snug">{sub}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Monto */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">Monto *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Ej: 50000"
            className="w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            required
          />
        </div>

        {/* Concepto */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">
            Concepto * <span className="text-text-muted/60">(¿para qué fue?)</span>
          </label>
          {/* Chips de conceptos frecuentes */}
          {sugeridos.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {sugeridos.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setConcepto(s)}
                  className="rounded-lg border border-border bg-surface-3 px-2.5 py-1 text-xs text-text-muted transition hover:border-primary/50 hover:text-text"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder='Ej: "Pago de alquiler de mi cuenta" · "Retiro para uso personal"'
            maxLength={255}
            className="w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            required
          />
        </div>

        {/* Fecha */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">Fecha *</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            required
          />
        </div>

        {/* Toggle detalles opcionales */}
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="flex items-center gap-1 text-xs text-text-muted transition hover:text-text"
        >
          {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {showDetails ? "Ocultar detalles" : "Agregar detalles (referencia, notas)"}
        </button>

        {/* Campos opcionales */}
        {showDetails && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">
                Referencia <span className="text-text-muted/60">(opcional)</span>
              </label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Nro. de transferencia, recibo..."
                maxLength={255}
                className="w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">
                Notas <span className="text-text-muted/60">(opcional)</span>
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Cualquier detalle adicional..."
                rows={2}
                maxLength={2000}
                className="w-full resize-none rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              />
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button type="submit" loading={isLoading} disabled={isLoading}>
            {esEdicion ? "Guardar cambios" : "Registrar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
