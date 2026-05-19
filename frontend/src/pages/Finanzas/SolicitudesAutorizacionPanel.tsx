import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, ShieldCheck, XCircle } from "lucide-react";
import { authApi, type OwnerAuthorizationRequest } from "../../features/auth/api";
import { Card } from "../../shared/ui/Card";
import { Button } from "../../shared/ui/Button";
import { useToast } from "../../shared/ui/Toast";
import { formatMoney } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errorMessage";

function formatFecha(value: unknown) {
  if (!value) return "-";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : String(value);
}

function formatHora(value: string) {
  const match = String(value).match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "";
}

function metodoLabel(value: unknown) {
  const labels: Record<string, string> = {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    tarjeta: "Tarjeta",
    otro: "Otro",
  };
  return labels[String(value)] ?? "Efectivo";
}

function requestTitle(request: OwnerAuthorizationRequest) {
  const payload = request.payload || {};
  if (request.accion === "actualizar_medio_pago_venta_rapida") {
    return `Corregir venta #${payload.venta_id} a ${metodoLabel(payload.medio_pago)}`;
  }

  const monto = Number(payload.monto || 0);
  const tipo = payload.tipo === "retiro_titular" ? "Retiro de caja" : "Ingreso manual";
  return `${tipo}: ${formatMoney(monto)} por ${metodoLabel(payload.metodo_pago)}`;
}

function requestDescription(request: OwnerAuthorizationRequest) {
  const payload = request.payload || {};
  if (request.accion === "actualizar_medio_pago_venta_rapida") {
    return "Caja Rapida - correccion de metodo de pago";
  }

  return `${String(payload.concepto || "Movimiento manual")} - ${formatFecha(payload.fecha)}`;
}

export function SolicitudesAutorizacionPanel() {
  const qc = useQueryClient();
  const { add } = useToast();
  const [approvedCode, setApprovedCode] = useState<{ id: number; code: string } | null>(null);

  const query = useQuery({
    queryKey: ["owner-authorization-requests", "pending"],
    queryFn: () => authApi.authorizationRequests({ status: "pending", limit: 20 }),
    refetchInterval: 10_000,
    staleTime: 0,
  });

  const approve = useMutation({
    mutationFn: (request: OwnerAuthorizationRequest) => authApi.approveAuthorizationRequest(request.id),
    onSuccess: (response) => {
      const request = response.data.data;
      if (request.code) {
        setApprovedCode({ id: request.id, code: request.code });
      }
      qc.invalidateQueries({ queryKey: ["owner-authorization-requests"] });
      add("Solicitud autorizada.", "success");
    },
    onError: (err) => add(getErrorMessage(err), "error"),
  });

  const reject = useMutation({
    mutationFn: (request: OwnerAuthorizationRequest) => authApi.rejectAuthorizationRequest(request.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-authorization-requests"] });
      add("Solicitud rechazada.", "success");
    },
    onError: (err) => add(getErrorMessage(err), "error"),
  });

  const rows = query.data?.data.data ?? [];
  if (!query.isLoading && rows.length === 0 && !approvedCode) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
            <ShieldCheck size={18} className="text-amber-300" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">Solicitudes de autorizacion</h2>
            <p className="text-xs text-text-muted">
              Pedidos pendientes para operar caja. El codigo sirve solo para la operacion aprobada.
            </p>
          </div>
        </div>
        {query.isFetching && <span className="text-xs text-text-muted">Actualizando...</span>}
      </div>

      {approvedCode && (
        <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
          <div className="mb-1 flex items-center gap-2">
            <KeyRound size={15} className="text-green-300" />
            <p className="text-sm font-semibold text-green-200">Codigo autorizado</p>
          </div>
          <p className="text-3xl font-black tracking-[0.35em] text-green-200">{approvedCode.code}</p>
          <p className="mt-1 text-xs text-text-muted">Pasale este codigo a recepcion. Vence en 10 minutos.</p>
        </div>
      )}

      {query.isLoading && (
        <div className="h-16 animate-pulse rounded-xl bg-surface-2" />
      )}

      {!query.isLoading && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((request) => {
            const loading = approve.isPending || reject.isPending;
            return (
              <div
                key={request.id}
                className="grid gap-3 rounded-xl border border-border bg-surface-2/50 px-4 py-3 md:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                      Pendiente
                    </span>
                    <span className="text-xs text-text-muted">
                      {request.solicitante.nombre} {formatHora(request.created_at)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-text">{requestTitle(request)}</p>
                  <p className="truncate text-xs text-text-muted">{requestDescription(request)}</p>
                </div>
                <div className="flex items-center gap-2 md:justify-end">
                  <Button
                    size="sm"
                    onClick={() => approve.mutate(request)}
                    loading={approve.isPending}
                    disabled={loading}
                  >
                    <CheckCircle2 size={14} />
                    Autorizar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => reject.mutate(request)}
                    loading={reject.isPending}
                    disabled={loading}
                  >
                    <XCircle size={14} />
                    Rechazar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
