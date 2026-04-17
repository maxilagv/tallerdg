import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { empleadosApi, type Rol } from "../../features/empleados/api";
import { Button } from "../../shared/ui/Button";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";

const modulos = [
  "clientes",
  "vehiculos",
  "ordenes",
  "cobros",
  "productos",
  "servicios",
  "gastos",
  "finanzas",
  "empleados",
  "configuracion",
];

const moduloLabels: Record<string, string> = {
  clientes:     "Clientes",
  vehiculos:    "Vehículos",
  ordenes:      "Trabajos",
  cobros:       "Cobros",
  productos:    "Stock",
  servicios:    "Servicios",
  gastos:       "Gastos",
  finanzas:     "Caja",
  empleados:    "Empleados",
  configuracion:"Configuración",
};

interface GestionRolesProps {
  open: boolean;
  rol: Rol | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function GestionRoles({ open, rol, onClose, onSuccess }: GestionRolesProps) {
  const { add } = useToast();

  const [nombre, setNombre] = useState("");
  const [permisos, setPermisos] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!rol) {
      setNombre("");
      setPermisos({});
      return;
    }

    setNombre(rol.nombre);
    setPermisos(rol.permisos || {});
  }, [rol, open]);

  const mutation = useMutation({
    mutationFn: () =>
      empleadosApi.actualizarRol(rol!.id, {
        nombre,
        permisos,
      }),
    onSuccess: () => {
      add("Permisos del rol actualizados.");
      onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const updatePermiso = (modulo: string, value: string) => {
    setPermisos((state) => ({
      ...state,
      [modulo]: value,
    }));
  };

  return (
    <Modal open={open} onClose={onClose} title={`Permisos de ${rol?.nombre || "rol"}`} size="xl">
      {rol?.id === 1 ? (
        <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-text-muted">
          El rol administrador tiene acceso total y no se modifica desde esta pantalla.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Nombre del rol</label>
            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            />
          </div>

          <div className="space-y-3">
            {modulos.map((modulo) => (
              <div
                key={modulo}
                className="grid items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 md:grid-cols-[160px_1fr]"
              >
                <div className="text-sm font-medium text-text">{moduloLabels[modulo] ?? modulo}</div>
                <select
                  value={permisos[modulo] || "none"}
                  onChange={(event) => updatePermiso(modulo, event.target.value)}
                  className="rounded-xl border border-border bg-surface-3 px-3 py-2 text-sm text-text outline-none transition focus:border-primary"
                >
                  <option value="none">Sin acceso</option>
                  <option value="r">Solo lectura</option>
                  <option value="rw">Leer y editar</option>
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
              Guardar permisos
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
