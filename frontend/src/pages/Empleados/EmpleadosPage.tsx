import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, KeyRound, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { empleadosApi, type Empleado, type Rol } from "../../features/empleados/api";
import { useDebounce } from "../../shared/hooks/useDebounce";
import { useConfirm } from "../../shared/hooks/useConfirm";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { EmptyState } from "../../shared/ui/EmptyState";
import { TableSkeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";
import { EmpleadoModal } from "./EmpleadoModal";
import { GestionRoles } from "./GestionRoles";

const roleColors: Record<string, "orange" | "blue" | "green" | "gray"> = {
  admin: "orange",
  mecanico: "blue",
  recepcionista: "green",
};

const modulos = ["clientes", "vehiculos", "ordenes", "cobros", "productos", "servicios", "gastos", "finanzas", "empleados", "configuracion"];

const moduloLabels: Record<string, string> = {
  clientes: "Clientes",
  vehiculos: "Vehículos",
  ordenes: "Trabajos",
  cobros: "Cobros",
  productos: "Stock",
  servicios: "Servicios",
  gastos: "Gastos",
  finanzas: "Finanzas",
  empleados: "Empleados",
  configuracion: "Configuración",
};

export function EmpleadosPage() {
  const queryClient = useQueryClient();
  const { add } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [editing, setEditing] = useState<Empleado | null>(null);
  const [roleEditing, setRoleEditing] = useState<Rol | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const { confirm, confirmModalProps } = useConfirm();

  const empleadosQuery = useQuery({
    queryKey: ["empleados", page, debouncedSearch],
    queryFn: () => empleadosApi.listar({ page, limit: 12, q: debouncedSearch || undefined }),
  });

  const rolesQuery = useQuery({
    queryKey: ["roles-empleados"],
    queryFn: () => empleadosApi.listarRoles(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => empleadosApi.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empleados"] });
      add("Empleado eliminado.");
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const empleados = empleadosQuery.data?.data.data.rows ?? [];
  const total = empleadosQuery.data?.data.data.total ?? 0;
  const roles = rolesQuery.data?.data.data ?? [];

  const handleEliminar = async (empleado: Empleado) => {
    const ok = await confirm({
      title: `¿Dar de baja a ${empleado.nombre}?`,
      description: "No podrá ingresar al sistema con su usuario actual.",
      confirmLabel: "Sí, dar de baja",
      variant: "danger",
    });

    if (ok) {
      deleteMutation.mutate(empleado.id);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text">Empleados y roles</h1>
          <p className="mt-1 text-sm text-text-muted">
            Gestioná accesos, perfiles y permisos por módulo para cada integrante del taller.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={16} /> Nuevo empleado
        </Button>
      </div>

      <Card>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre o email..."
            className="w-full rounded-xl border border-border bg-surface-3 px-10 py-2.5 text-sm text-text outline-none transition focus:border-primary"
          />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_360px]">
        <Card padding={false}>
          {empleadosQuery.isLoading ? (
            <div className="p-5">
              <TableSkeleton rows={6} />
            </div>
          ) : empleados.length === 0 ? (
            <EmptyState
              title="No hay empleados para mostrar"
              description={search ? "No encontramos empleados con ese criterio." : "Creá el primer empleado para empezar."}
              action={
                search
                  ? undefined
                  : {
                      label: "Crear empleado",
                      onClick: () => setModalOpen(true),
                    }
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
                      <th className="px-4 py-3">Empleado</th>
                      <th className="px-4 py-3">Rol</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empleados.map((empleado) => (
                      <tr key={empleado.id} className="border-b border-border/60 transition hover:bg-surface-2">
                        <td className="px-4 py-3">
                          <div className="font-medium text-text">
                            {empleado.nombre} {empleado.apellido}
                          </div>
                          <div className="text-xs text-text-muted">{empleado.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={roleColors[empleado.rol_nombre] || "gray"}>{empleado.rol_nombre}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={Boolean(empleado.activo) ? "green" : "red"}>
                            {Boolean(empleado.activo) ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditing(empleado);
                                setModalOpen(true);
                              }}
                            >
                              <Edit size={15} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const role = roles.find((item) => item.id === empleado.rol_id) || null;
                                setRoleEditing(role);
                                setRolesOpen(true);
                              }}
                            >
                              <Settings2 size={15} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditing(empleado);
                                setModalOpen(true);
                              }}
                            >
                              <KeyRound size={15} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEliminar(empleado)}>
                              <Trash2 size={15} className="text-red-300" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {total > 12 ? (
                <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
                  <span className="text-text-muted">
                    Mostrando {(page - 1) * 12 + 1} - {Math.min(page * 12, total)} de {total}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
                      Anterior
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page * 12 >= total}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-text">Resumen de roles</h2>
          <div className="mt-4 space-y-3">
            {roles.map((rol) => (
              <div key={rol.id} className="rounded-xl border border-border bg-surface-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant={roleColors[rol.nombre] || "gray"}>{rol.nombre}</Badge>
                  {rol.id !== 1 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRoleEditing(rol);
                        setRolesOpen(true);
                      }}
                    >
                      Editar permisos
                    </Button>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {modulos.map((modulo) => {
                    const permiso = rol.permisos["*"] === "rw" ? "rw" : rol.permisos[modulo];
                    return (
                      <div key={modulo} className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${
                        permiso === "rw" ? "bg-blue-500/10 text-blue-300"
                        : permiso === "r" ? "bg-surface-3 text-text-muted"
                        : "opacity-30 text-text-muted"
                      }`}>
                        <span>{moduloLabels[modulo] ?? modulo}</span>
                        <span className="font-medium">
                          {permiso === "rw" ? "✓ Editar" : permiso === "r" ? "Solo ver" : "Sin acceso"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <EmpleadoModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["empleados"] });
        }}
      />

      <GestionRoles
        open={rolesOpen}
        rol={roleEditing}
        onClose={() => setRolesOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["empleados"] });
          queryClient.invalidateQueries({ queryKey: ["roles-empleados"] });
        }}
      />

      <ConfirmModal {...confirmModalProps} loading={deleteMutation.isPending} />
    </div>
  );
}
