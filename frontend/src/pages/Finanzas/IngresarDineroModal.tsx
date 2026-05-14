import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Banknote, CheckCircle2, CreditCard, KeyRound } from "lucide-react";
import { finanzasApi, type MovimientoTitularPayload } from "../../features/finanzas/api";
import { authApi, type OwnerAuthorizationRequest } from "../../features/auth/api";
import { Button } from "../../shared/ui/Button";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { useAuthStore } from "../../shared/store/authStore";
import { formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";

function formatFecha(fecha: string) {
  if (!fecha) return "";
  const [y, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

interface Props {
  open: boolean;
  fechaInicial: string;
  onClose: () => void;
}

export function IngresarDineroModal({ open, fechaInicial, onClose }: Props) {
  const qc = useQueryClient();
  const { add } = useToast();
  const empleado = useAuthStore((state) => state.empleado);
  const esAdmin = empleado?.permisos?.["*"] === "rw";

  const [fecha, setFecha] = useState(fechaInicial);
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "transferencia">("efectivo");
  const [descripcion, setDescripcion] = useState("");
  const [codigo, setCodigo] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<MovimientoTitularPayload | null>(null);
  const [authorizationRequest, setAuthorizationRequest] = useState<OwnerAuthorizationRequest | null>(null);

  useEffect(() => {
    if (!open) return;
    setFecha(fechaInicial);
    setMonto("");
    setMetodoPago("efectivo");
    setDescripcion("");
    setCodigo("");
    setConfirmando(false);
    setPendingPayload(null);
    setAuthorizationRequest(null);
  }, [fechaInicial, open]);

  const invalidarCaja = () => {
    qc.invalidateQueries({ queryKey: ["finanzas-resumen"] });
    qc.invalidateQueries({ queryKey: ["finanzas-movimientos-detalle"] });
    qc.invalidateQueries({ queryKey: ["finanzas-movimientos-titular"] });
    qc.invalidateQueries({ queryKey: ["finanzas-por-dia"] });
    qc.invalidateQueries({ queryKey: ["finanzas-movimientos-mes"] });
    qc.invalidateQueries({ queryKey: ["finanzas-analisis"] });
    qc.invalidateQueries({ queryKey: ["owner-authorization-requests"] });
  };

  const mutation = useMutation({
    mutationFn: (vars: { payload: MovimientoTitularPayload; ownerToken?: string }) =>
      finanzasApi.crearMovimientoTitular(vars.payload, vars.ownerToken),
    onSuccess: () => {
      invalidarCaja();
      add("Dinero ingresado en caja.", "success");
      setPendingPayload(null);
      setAuthorizationRequest(null);
      onClose();
    },
    onError: (err) => add(getErrorMessage(err), "error"),
  });

  const requestAuthorization = useMutation({
    mutationFn: (payload: MovimientoTitularPayload) =>
      authApi.createAuthorizationRequest({
        scope: "cash_manual_movements",
        accion: "crear_movimiento_titular",
        payload,
      }),
    onSuccess: (response, payload) => {
      setPendingPayload(payload);
      setAuthorizationRequest(response.data.data);
      setConfirmando(false);
      add("Solicitud enviada al administrador.", "success");
    },
    onError: (err) => add(getErrorMessage(err), "error"),
  });

  const redeemAuthorization = useMutation({
    mutationFn: (vars: { requestId: number; code: string }) =>
      authApi.redeemAuthorizationRequest(vars),
    onSuccess: (response) => {
      if (pendingPayload) {
        mutation.mutate({ payload: pendingPayload, ownerToken: response.data.token });
      }
    },
    onError: (err) => add(getErrorMessage(err), "error"),
  });

  const montoNum = Number(monto.replace(",", "."));
  const montoValido = Number.isFinite(montoNum) && montoNum > 0;
  const isLoading = mutation.isPending || requestAuthorization.isPending || redeemAuthorization.isPending;

  const buildPayload = (): MovimientoTitularPayload => {
    const concepto = descripcion.trim() || "Ingreso manual de dinero";
    return {
      tipo: "aporte_titular",
      monto: montoNum,
      metodo_pago: metodoPago,
      concepto,
      fecha,
      referencia: null,
      notas: null,
    };
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!fecha) {
      add("Elegi una fecha valida.", "error");
      return;
    }
    if (!montoValido) {
      add("El monto debe ser mayor que cero.", "error");
      return;
    }
    if (!confirmando) {
      setConfirmando(true);
      return;
    }

    const payload = buildPayload();
    if (esAdmin) {
      mutation.mutate({ payload });
      return;
    }
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
    <Modal open={open} onClose={onClose} title="Ingresar dinero" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-green-500/25 bg-green-500/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-500/15">
              <Banknote size={18} className="text-green-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-200">Carga manual de dinero</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Impacta en la caja de la fecha elegida y queda registrado con fecha y hora.
              </p>
              {!esAdmin && (
                <p className="mt-1 text-xs text-amber-200">
                  Se enviara una solicitud al administrador para que te de un codigo.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(event) => {
                setFecha(event.target.value);
                setConfirmando(false);
              }}
              className="w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">Monto</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={monto}
              onChange={(event) => {
                setMonto(event.target.value);
                setConfirmando(false);
              }}
              placeholder="Ej: 50000"
              className="w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">Metodo</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "efectivo", label: "Efectivo", Icon: Banknote },
              { value: "transferencia", label: "Transferencia", Icon: CreditCard },
            ].map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMetodoPago(value as "efectivo" | "transferencia");
                  setConfirmando(false);
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  metodoPago === value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-surface-3 text-text-muted hover:text-text"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">
            Descripcion <span className="text-text-muted/60">(opcional)</span>
          </label>
          <input
            type="text"
            value={descripcion}
            onChange={(event) => {
              setDescripcion(event.target.value);
              setConfirmando(false);
            }}
            placeholder='Ej: "Ingreso manual sabado", "Correccion"'
            maxLength={255}
            className="w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
          />
        </div>

        {confirmando && montoValido && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
              <p className="text-sm text-text">
                Confirmar ingreso de <strong>{formatMoney(montoNum)}</strong> en la caja del{" "}
                <strong>{formatFecha(fecha)}</strong> por{" "}
                <strong>{metodoPago === "efectivo" ? "efectivo" : "transferencia"}</strong>.
              </p>
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
              <Button type="button" onClick={handleRedeem} loading={redeemAuthorization.isPending || mutation.isPending}>
                Validar
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" loading={requestAuthorization.isPending || mutation.isPending} disabled={isLoading || !!authorizationRequest}>
            {confirmando ? (esAdmin ? "Confirmar ingreso" : "Pedir autorizacion") : "Ingresar dinero"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
