import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { categoriasApi } from "../../features/categorias/api";
import { serviciosApi } from "../../features/servicios/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";

const schema = z.object({
  porcentaje: z.string().min(1, "Indica el porcentaje"),
  categoria_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AumentoMasivoModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AumentoMasivoModal({ open, onClose, onSuccess }: AumentoMasivoModalProps) {
  const { add } = useToast();

  const categoriasQuery = useQuery({
    queryKey: ["categorias-servicio"],
    queryFn: () => categoriasApi.listar("servicio"),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      porcentaje: "",
      categoria_id: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      serviciosApi.aumentoMasivo({
        porcentaje: Number(values.porcentaje),
        categoria_id: values.categoria_id ? Number(values.categoria_id) : null,
      }),
    onSuccess: () => {
      add("Precios actualizados.");
      onSuccess();
      reset();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const categorias = categoriasQuery.data?.data.data ?? [];

  return (
    <Modal open={open} onClose={onClose} title="Aumento masivo de precios" size="md">
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
        <p className="text-sm leading-6 text-text-muted">
          Aplica un incremento porcentual sobre todos los servicios activos o solo sobre una categoria puntual.
        </p>

        <Input
          label="Porcentaje de aumento"
          type="number"
          min="0.01"
          step="0.01"
          error={errors.porcentaje?.message}
          {...register("porcentaje")}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Categoria (opcional)</label>
          <select
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            {...register("categoria_id")}
          >
            <option value="">Todas las categorias</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Aplicar aumento
          </Button>
        </div>
      </form>
    </Modal>
  );
}
