import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Settings2,
  Wallet,
} from "lucide-react";
import { sueldosApi, periodoPagoLabel, type EmpleadoResumen } from "../../features/sueldos/api";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { TableSkeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { formatDate, formatMoney } from "../../shared/utils/format";
import { AdelantoModal } from "./AdelantoModal";
import { LiquidarModal } from "./LiquidarModal";
import { SueldoConfigModal } from "./SueldoConfigModal";

type ModalState =
  | { type: "config"; emp: EmpleadoResumen }
  | { type: "adelanto"; emp: EmpleadoResumen }
  | { type: "liquidar"; emp: EmpleadoResumen }
  | null;

function calcularMontoPeriodo(total: number, periodo?: "semana" | "quincena" | "mes") {
  if (periodo === "semana") return total / 4;
  if (periodo === "quincena") return total / 2;
  return total;
}

export function SueldosPage() {
  const queryClient = useQueryClient();
  const { add } = useToast();
  const [modal, setModal] = useState<ModalState>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0, 10));

  const query = useQuery({
    queryKey: ["sueldos-resumen"],
    queryFn: () => sueldosApi.getResumen(),
  });

  const historialQuery = useQuery({
    queryKey: ["sueldos-historial", expandedId],
    queryFn: () => sueldosApi.getHistorial(expandedId!, { page: 1, limit: 6 }),
    enabled: expandedId !== null,
  });

  const empleados = query.data?.data.data ?? [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["sueldos-resumen"] });
    queryClient.invalidateQueries({ queryKey: ["sueldos-historial"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-hoy"] });
  };

  const closeModal = () => setModal(null);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text">Sueldos</h1>
        <p className="mt-1 text-sm text-text-muted">
          Gestiona periodos, adelantos y liquidaciones del equipo.
        </p>
      </div>

      {query.isLoading ? (
        <Card>
          <TableSkeleton rows={4} />
        </Card>
      ) : empleados.length === 0 ? (
        <Card>
          <EmptyState
            title="No hay empleados"
            description="Primero crea empleados en la seccion Empleados."
            icon={Wallet}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {empleados.map((emp) => (
            <EmpleadoCard
              key={emp.id}
              emp={emp}
              expanded={expandedId === emp.id}
              historial={expandedId === emp.id ? historialQuery.data?.data.data : undefined}
              historialLoading={expandedId === emp.id && historialQuery.isLoading}
              fechaInicio={fechaInicio}
              onFechaInicio={setFechaInicio}
              onToggleExpand={() => setExpandedId((value) => (value === emp.id ? null : emp.id))}
              onConfig={() => setModal({ type: "config", emp })}
              onAdelanto={() => setModal({ type: "adelanto", emp })}
              onLiquidar={() => setModal({ type: "liquidar", emp })}
              onAbrirPeriodo={async () => {
                try {
                  await sueldosApi.abrirPeriodo(emp.id, { fecha_inicio: fechaInicio });
                  refresh();
                  add("Periodo iniciado.");
                } catch (error) {
                  add(getErrorMessage(error), "error");
                }
              }}
            />
          ))}
        </div>
      )}

      {modal?.type === "config" && (
        <SueldoConfigModal
          open
          onClose={closeModal}
          onSuccess={refresh}
          empleadoId={modal.emp.id}
          empleadoNombre={`${modal.emp.nombre} ${modal.emp.apellido}`}
          configActual={modal.emp.config}
        />
      )}

      {modal?.type === "adelanto" && modal.emp.periodo_actual && (
        <AdelantoModal
          open
          onClose={closeModal}
          onSuccess={refresh}
          periodoId={modal.emp.periodo_actual.id}
          empleadoNombre={`${modal.emp.nombre} ${modal.emp.apellido}`}
          saldoDisponible={
            Number(modal.emp.periodo_actual.sueldo_base) -
            (modal.emp.periodo_actual.total_adelantos ?? 0)
          }
        />
      )}

      {modal?.type === "liquidar" && modal.emp.periodo_actual && (
        <LiquidarModal
          open
          onClose={closeModal}
          onSuccess={refresh}
          periodo={modal.emp.periodo_actual}
          empleadoNombre={`${modal.emp.nombre} ${modal.emp.apellido}`}
        />
      )}
    </div>
  );
}

interface EmpleadoCardProps {
  emp: EmpleadoResumen;
  expanded: boolean;
  historial: { rows: any[]; total: number } | undefined;
  historialLoading: boolean;
  fechaInicio: string;
  onFechaInicio: (value: string) => void;
  onToggleExpand: () => void;
  onConfig: () => void;
  onAdelanto: () => void;
  onLiquidar: () => void;
  onAbrirPeriodo: () => void;
}

function EmpleadoCard({
  emp,
  expanded,
  historial,
  historialLoading,
  fechaInicio,
  onFechaInicio,
  onToggleExpand,
  onConfig,
  onAdelanto,
  onLiquidar,
  onAbrirPeriodo,
}: EmpleadoCardProps) {
  const periodo = emp.periodo_actual;
  const config = emp.config;
  const hoy = new Date().toISOString().slice(0, 10);
  const vencido = periodo && periodo.fecha_fin < hoy;

  const adelantos = periodo?.total_adelantos ?? 0;
  const sueldoPeriodo = periodo
    ? Number(periodo.sueldo_base)
    : calcularMontoPeriodo(Number(config?.sueldo_base ?? 0), config?.periodo_pago);
  const saldoRestante = sueldoPeriodo - adelantos;
  const pct = sueldoPeriodo > 0 ? Math.min((adelantos / sueldoPeriodo) * 100, 100) : 0;

  return (
    <Card padding={false}>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-text">
              {emp.nombre} {emp.apellido}
            </span>
            <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs text-text-muted capitalize">
              {emp.rol?.replace("_", " ")}
            </span>
            {vencido && (
              <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-300">
                <AlertTriangle size={11} /> Periodo vencido
              </span>
            )}
            {periodo && !vencido && (
              <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-300">
                Periodo activo
              </span>
            )}
          </div>

          {config ? (
            <div className="mt-1 space-y-1 text-sm text-text-muted">
              <p>
                Sueldo total: <strong className="text-text">{formatMoney(config.sueldo_base)}</strong>
                {" · "}
                {periodoPagoLabel[config.periodo_pago]}
              </p>
              <p>
                Pago por periodo: <strong className="text-text">{formatMoney(sueldoPeriodo)}</strong>
              </p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-yellow-300">Sin sueldo configurado</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onConfig}>
            <Settings2 size={15} /> Configurar
          </Button>

          {periodo ? (
            <>
              <Button variant="secondary" size="sm" onClick={onAdelanto}>
                + Adelanto
              </Button>
              <Button size="sm" onClick={onLiquidar}>
                Liquidar
              </Button>
            </>
          ) : config ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => onFechaInicio(e.target.value)}
                className="rounded-lg border border-border bg-surface-3 px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
              />
              <Button size="sm" onClick={onAbrirPeriodo}>
                <CalendarClock size={15} /> Iniciar periodo
              </Button>
            </div>
          ) : null}

          <button onClick={onToggleExpand} className="text-text-muted transition hover:text-text">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {periodo && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
            <span>
              Periodo: {formatDate(periodo.fecha_inicio)} {"->"} {formatDate(periodo.fecha_fin)}
            </span>
            <span>
              Adelantos: <strong className="text-red-300">{formatMoney(adelantos)}</strong>
              {" / "}
              <strong className="text-text">{formatMoney(sueldoPeriodo)}</strong>
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className={`h-full rounded-full transition-all ${
                pct >= 100 ? "bg-red-400" : pct >= 70 ? "bg-yellow-400" : "bg-primary"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-text-muted">Saldo a cobrar</span>
            <span className={`font-bold ${saldoRestante < 0 ? "text-red-300" : "text-green-300"}`}>
              {formatMoney(Math.max(0, saldoRestante))}
            </span>
          </div>
        </div>
      )}

      {expanded && (
        <div className="border-t border-border bg-surface-2 px-4 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Historial de periodos
          </p>
          {historialLoading ? (
            <p className="text-xs text-text-muted">Cargando...</p>
          ) : historial?.rows.length ? (
            <div className="space-y-2">
              {historial.rows.map((periodoItem: any) => (
                <div
                  key={periodoItem.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium text-text">
                      {formatDate(periodoItem.fecha_inicio)} {"->"} {formatDate(periodoItem.fecha_fin)}
                    </span>
                    <span className="ml-3 text-xs text-text-muted">
                      Adelantos: {formatMoney(periodoItem.total_adelantos)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-text">
                      {formatMoney(Number(periodoItem.sueldo_base) - periodoItem.total_adelantos)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        periodoItem.estado === "pagado"
                          ? "bg-green-500/15 text-green-300"
                          : "bg-yellow-500/15 text-yellow-300"
                      }`}
                    >
                      {periodoItem.estado === "pagado" ? "Pagado" : "Abierto"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted">Sin periodos anteriores.</p>
          )}
        </div>
      )}
    </Card>
  );
}
