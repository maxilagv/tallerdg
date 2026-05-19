import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine, ChevronDown, ChevronUp, KeyRound } from "lucide-react";
import { finanzasApi, type MovimientoTitularPayload, type TipoMovimientoTitular } from "../../features/finanzas/api";
import { authApi, type OwnerAuthorizationRequest } from "../../features/auth/api";
import { Modal } from "../../shared/ui/Modal";
import { Button } from "../../shared/ui/Button";
import { useToast } from "../../shared/ui/Toast";
import { useAuthStore } from "../../shared/store/authStore";
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
  movimiento?: { id: number; tipo: TipoMovimientoTitular; monto: number; metodo_pago?: "efectivo" | "transferencia"; concepto: string; referencia: string | null; fecha: string; notas: string | null } | null;
}

export function RegistrarMovimientoModal({ open, onClose, movimiento }: Props) {
  const qc     = useQueryClient();
  const { add } = useToast();
  const empleado = useAuthStore((state) => state.empleado);
  const esAdmin  = empleado?.permisos?.["*"] === "rw";
  const esEdicion = !!movimiento;

  const [tipo,       setTipo]       = useState<TipoMovimientoTitular>(movimiento?.tipo ?? "aporte_titular");
  const [monto,      setMonto]      = useState(movimiento ? String(movimiento.monto) : "");
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "transferencia">(movimiento?.metodo_pago ?? "efectivo");
  const [concepto,   setConcepto]   = useState(movimiento?.concepto ?? "");
  const [referencia, setReferencia] = useState(movimiento?.referencia ?? "");
  const [fecha,      setFecha]      = useState(movimiento?.fecha?.slice(0, 10) ?? today());
  const [notas,      setNotas]      = useState(movimiento?.notas ?? "");

  // Campos opcionales colapsados por defecto; se abren automáticamente en edición si tienen datos
  const [showDetails, setShowDetails] = useState(false);

  // Conceptos sugeridos del historial local
  const [sugeridos, setSugeridos] = useState<string[]>([]);

  // Autorizacion del dueño (solo si el usuario no es admin)
  const [codigo, setCodigo] = useState("");
  const [pendingPayload, setPendingPayload] = useState<MovimientoTitularPayload | null>(null);
  const [authorizationRequest, setAuthorizationRequest] = useState<OwnerAuthorizationRequest | null>(null);

  useEffect(() => {
    if (open) {
      setSugeridos(getConceptosSugeridos());
      setMetodoPago(movimiento?.metodo_pago ?? "efectivo");
      setShowDetails(!!(movimiento?.referencia || movimiento?.notas));
      setCodigo("");
      setPendingPayload(null);
      setAuthorizationRequest(null);
    }
  }, [open, movimiento]);

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["finanzas-resumen"] });
    qc.invalidateQueries({ queryKey: ["finanzas-movimientos-detalle"] });
    qc.invalidateQueries({ queryKey: ["finanzas-movimientos-titular"] });
    qc.invalidateQueries({ queryKey: ["finanzas-analisis"] });
    qc.invalidateQueries({ queryKey: ["finanzas-movimientos-mes"] });
    qc.invalidateQueries({ queryKey: ["owner-authorization-requests"] });
  };

  const crear = useMutation({
    mutationFn: (vars: { payload: MovimientoTitularPayload; ownerToken?: string }) =>
      finanzasApi.crearMovimientoTitular(vars.payload, vars.ownerToken),
    onSuccess: () => {
      invalidar();
      add("Movimiento registrado.", "success");
      setPendingPayload(null);
      setAuthorizationRequest(null);
      setCodigo("");
      onClose();
    },
    onError:   (err) => add(getErrorMessage(err), "error"),
  });

  const editar = useMutation({
    mutationFn: (vars: { payload: Partial<MovimientoTitularPayload>; ownerToken?: string }) =>
      finanzasApi.actualizarMovimientoTitular(movimiento!.id, vars.payload, vars.ownerToken),
    onSuccess: () => {
      invalidar();
      add("Movimiento actualizado.", "success");
      setPendingPayload(null);
      setAuthorizationRequest(null);
      setCodigo("");
      onClose();
    },
    onError:   (err) => add(getErrorMessage(err), "error"),
  });

  const isLoading = crear.isPending || editar.isPending;

  const requestAuthorization = useMutation({
    mutationFn: (payload: MovimientoTitularPayload) =>
      authApi.createAuthorizationRequest({
        scope: "cash_manual_movements",
        accion: esEdicion ? "actualizar_movimiento_titular" : "crear_movimiento_titular",
        payload,
      }),
    onSuccess: (response, payload) => {
      setPendingPayload(payload);
      setAuthorizationRequest(response.data.data);
      add("Solicitud enviada al administrador.", "success");
      invalidar();
    },
    onError: (err) => add(getErrorMessage(err), "error"),
  });

  const redeemAuthorization = useMutation({
    mutationFn: (vars: { requestId: number; code: string }) =>
      authApi.redeemAuthorizationRequest(vars),
    onSuccess: (response) => {
      if (!pendingPayload) return;
      if (esEdicion) editar.mutate({ payload: pendingPayload, ownerToken: response.data.token });
      else           crear.mutate({ payload: pendingPayload, ownerToken: response.data.token });
    },
    onError: (err) => add(getErrorMessage(err), "error"),
  });

  const loadingAll = isLoading || requestAuthorization.isPending || redeemAuthorization.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(monto.replace(",", "."));
    if (!concepto.trim()) { add("El concepto es obligatorio.", "error"); return; }
    if (isNaN(montoNum) || montoNum <= 0) { add("El monto debe ser mayor que cero.", "error"); return; }

    const payload: MovimientoTitularPayload = {
      tipo,
      monto:      montoNum,
      metodo_pago: metodoPago,
      concepto:   concepto.trim(),
      referencia: referencia.trim() || null,
      fecha,
      notas:      notas.trim() || null,
    };

    guardarConcepto(concepto.trim());

    if (esAdmin) {
      if (esEdicion) editar.mutate({ payload });
      else           crear.mutate({ payload });
      return;
    }

    setPendingPayload(payload);
    requestAuthorization.mutate(payload);
  };

  const handleRedeem = () => {
    if (!authorizationRequest) return;
    const cleanCode = codigo.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      add("El codigo debe tener 6 digitos.", "error");
      return;
    }
    redeemAuthorization.mutate({ requestId: authorizationRequest.id, code: cleanCode });
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={esEdicion ? "Editar movimiento" : "Registrar movimiento de caja"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {!esAdmin && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
              <p className="text-xs text-amber-200">
                Como no sos admin, vamos a enviar una solicitud al administrador para que te de un codigo.
              </p>
            </div>
          )}

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
            <label className="mb-1.5 block text-xs font-medium text-text-muted">Metodo *</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "efectivo", label: "Efectivo" },
                { value: "transferencia", label: "Transferencia" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMetodoPago(item.value as "efectivo" | "transferencia")}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    metodoPago === item.value
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-surface-3 text-text-muted hover:text-text"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
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

          {!esAdmin && authorizationRequest && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <div className="mb-3 flex items-start gap-2">
                <KeyRound size={16} className="mt-0.5 shrink-0 text-amber-300" />
                <div>
                  <p className="text-sm font-semibold text-amber-100">Solicitud enviada</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    Pedile al administrador el codigo de 6 digitos para esta operacion.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  inputMode="numeric"
                  value={codigo}
                  onChange={(event) => setCodigo(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Codigo"
                  className="w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-center text-lg font-bold tracking-[0.35em] text-text outline-none transition focus:border-primary"
                />
                <Button type="button" onClick={handleRedeem} loading={redeemAuthorization.isPending || isLoading}>
                  Validar
                </Button>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loadingAll}>Cancelar</Button>
            <Button type="submit" loading={requestAuthorization.isPending || isLoading} disabled={loadingAll || !!authorizationRequest}>
              {esEdicion
                ? esAdmin ? "Guardar cambios" : "Pedir autorizacion"
                : esAdmin ? "Registrar" : "Pedir autorizacion"}
            </Button>
          </div>
        </form>
      </Modal>

    </>
  );
}
