import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { gastosApi, type CategoriaGasto } from "../../features/gastos/api";
import { useConfirm } from "../../shared/hooks/useConfirm";
import { Button } from "../../shared/ui/Button";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";

interface Props {
  categorias: CategoriaGasto[];
}

export function CategoriasGastoPanel({ categorias }: Props) {
  const qc = useQueryClient();
  const { add } = useToast();
  const { confirm, confirmModalProps } = useConfirm();

  const [nuevaNombre, setNuevaNombre] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoNombre, setEditandoNombre] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["gastos-categorias"] });

  const crearMutation = useMutation({
    mutationFn: () => gastosApi.crearCategoria(nuevaNombre.trim()),
    onSuccess: () => { add("Categoría creada."); setNuevaNombre(""); invalidate(); },
    onError: (e) => add(getErrorMessage(e), "error"),
  });

  const editarMutation = useMutation({
    mutationFn: (id: number) => gastosApi.actualizarCategoria(id, editandoNombre.trim()),
    onSuccess: () => { add("Categoría actualizada."); setEditandoId(null); invalidate(); },
    onError: (e) => add(getErrorMessage(e), "error"),
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => gastosApi.eliminarCategoria(id),
    onSuccess: () => { add("Categoría eliminada."); invalidate(); },
    onError: (e) => add(getErrorMessage(e), "error"),
  });

  const startEdit = (cat: CategoriaGasto) => {
    setEditandoId(cat.id);
    setEditandoNombre(cat.nombre);
  };

  const cancelEdit = () => setEditandoId(null);

  const handleEliminar = async (cat: CategoriaGasto) => {
    const ok = await confirm({
      title: `¿Eliminar la categoría "${cat.nombre}"?`,
      description: "Solo se puede eliminar si no tiene gastos registrados.",
      confirmLabel: "Eliminar",
      variant: "danger",
    });
    if (ok) eliminarMutation.mutate(cat.id);
  };

  return (
    <div className="space-y-3">
      {/* Lista de categorías existentes */}
      <div className="space-y-1.5">
        {categorias.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2"
          >
            {editandoId === cat.id ? (
              <>
                <input
                  value={editandoNombre}
                  onChange={(e) => setEditandoNombre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") editarMutation.mutate(cat.id);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="flex-1 rounded-lg border border-primary bg-surface px-2 py-1 text-sm text-text outline-none"
                  autoFocus
                />
                <button
                  onClick={() => editarMutation.mutate(cat.id)}
                  disabled={editarMutation.isPending}
                  className="text-green-400 hover:text-green-300 transition"
                >
                  <Check size={16} />
                </button>
                <button onClick={cancelEdit} className="text-text-muted hover:text-text transition">
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-text">{cat.nombre}</span>
                <button
                  onClick={() => startEdit(cat)}
                  className="text-text-muted hover:text-text transition"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleEliminar(cat)}
                  className="text-text-muted hover:text-red-300 transition"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Agregar nueva */}
      <div className="flex gap-2">
        <input
          value={nuevaNombre}
          onChange={(e) => setNuevaNombre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && nuevaNombre.trim()) crearMutation.mutate();
          }}
          placeholder="Nueva categoría..."
          className="flex-1 rounded-xl border border-border bg-surface-3 px-3 py-2 text-sm text-text outline-none transition focus:border-primary"
        />
        <Button
          size="sm"
          onClick={() => crearMutation.mutate()}
          loading={crearMutation.isPending}
          disabled={!nuevaNombre.trim()}
        >
          <Plus size={14} /> Agregar
        </Button>
      </div>

      <ConfirmModal {...confirmModalProps} loading={eliminarMutation.isPending} />
    </div>
  );
}
