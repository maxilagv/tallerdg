import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Banknote, CreditCard, KeyRound, Wifi } from "lucide-react";
import { authApi, type OwnerAuthorizationRequest } from "../../features/auth/api";
import {
  medioPagoMeta,
  ventasRapidasApi,
  type MedioPago,
  type VentaRapida,
} from "../../features/ventas-rapidas/api";
import { Button } from "../../shared/ui/Button";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { useAuthStore } from "../../shared/store/authStore";
import { formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";

const MEDIOS: Array<{ value: MedioPago; label: string; Icon: React.ElementType }> = [
  { value: "efectivo", label: "Efectivo", Icon: Banknote },
  { value: "tarjeta", label: "Tarjeta", Icon: CreditCard },
  { value: "transferencia", label: "Transferencia", Icon: Wifi },
  { value: "otro", label: "Otro", Icon: CreditCard },
];

interface Props {
  open: boolean;
  venta: VentaRapida | null;
  onClose: () => void;
}

export function EditarMedioPagoVentaModal({ open, venta, onClose }: Props) {
  const qc = useQueryClient();
  const { add } = useToast();
  const empleado = useAuthStore((state) => state.empleado);
  const esAdmin = empleado?.permisos?.["*"] === "rw";
  const [medioPago, setMedioPago] = useState<MedioPago>("efectivo");
  const [codigo, setCodigo] = useState("");
  const [authorizationRequest, setAuthorizationRequest] = useState<OwnerAuthorizationRequest | null>(null);

  useEffect(() => {
    if (!open || !venta) return;
    setMedioPago(venta.medio_pago);
    setCodigo("");
    setAuthorizationRequest(null);
  }, [open, venta]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["caja-rapida-ventas-recientes"] });
    qc.invalidateQueries({ queryKey: ["caja-saldo-hoy"] });
    qc.invalidateQueries({ queryKey: ["finanzas-resumen"] });
    qc.invalidateQueries({ queryKey: ["finanzas-por-dia"] });
    qc.invalidateQueries({ queryKey: ["finanzas-movimientos-detalle"] });
    qc.invalidateQueries({ queryKey: ["finanzas-movimientos-mes"] });
    qc.invalidateQueries({ queryKey: ["owner-authorization-requests"] });
  };

  const update = useMutation({
    mutationFn: (ownerToken?: string) => {
      if (!venta) throw new Error("No se encontro la venta.");
      return ventasRapidasApi.actualizarMedioPago(venta.id, { medio_pago: medioPago }, ownerToken);
    },
    onSuccess: () => {
      invalidate();
      add("Metodo de pago corregido.", "success");
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const requestAuthorization = useMutation({
    mutationFn: () => {
      if (!venta) throw new Error("No se encontro la venta.");
      return authApi.createAuthorizationRequest({
        scope: "cash_manual_movements",
        accion: "actualizar_medio_pago_venta_rapida",
        payload: { venta_id: venta.id, medio_pago: medioPago },
      });
    },
    onSuccess: (response) => {
      setAuthorizationRequest(response.data.data);
      add("Solicitud enviada al administrador.", "success");
      invalidate();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const redeemAuthorization = useMutation({
    mutationFn: (vars: { requestId: number; code: string }) =>
      authApi.redeemAuthorizationRequest(vars),
    onSuccess: (response) => update.mutate(response.data.token),
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const handleSubmit = () => {
    if (!venta || medioPago === venta.medio_pago) {
      add("Elegi un metodo distinto al actual.", "error");
      return;
    }

    if (esAdmin) {
      update.mutate(undefined);
      return;
    }

    requestAuthorization.mutate();
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

  const loading = update.isPending || requestAuthorization.isPending || redeemAuthorization.isPending;

  return (
    <Modal open={open} onClose={onClose} title="Editar metodo de pago" size="md">
      {venta ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm">
            <p className="font-semibold text-text">Venta #{venta.id} - {formatMoney(venta.total)}</p>
            <p className="mt-1 text-text-muted">
              Metodo actual: {medioPagoMeta[venta.medio_pago]?.label ?? venta.medio_pago}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {MEDIOS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMedioPago(value);
                  setAuthorizationRequest(null);
                  setCodigo("");
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  medioPago === value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-surface-3 text-text-muted hover:text-text"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {!esAdmin && authorizationRequest && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <div className="mb-3 flex items-start gap-2">
                <KeyRound size={16} className="mt-0.5 shrink-0 text-amber-300" />
                <div>
                  <p className="text-sm font-semibold text-amber-100">Solicitud enviada</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    Pedile al administrador el codigo de 6 digitos para confirmar esta correccion.
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
                <Button type="button" onClick={handleRedeem} loading={redeemAuthorization.isPending || update.isPending}>
                  Validar
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={requestAuthorization.isPending || update.isPending} disabled={loading || !!authorizationRequest || medioPago === venta.medio_pago}>
              {esAdmin ? "Guardar cambio" : "Pedir autorizacion"}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
