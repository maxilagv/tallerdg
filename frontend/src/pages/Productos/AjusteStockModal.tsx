import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { productosApi, type Producto } from "../../features/productos/api";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { useToast } from "../../shared/ui/Toast";
import { getErrorMessage } from "../../shared/utils/errorMessage";

const schema = z.object({
  nuevo_stock: z.string().min(1, "Indica el nuevo stock"),
  motivo: z.string().min(1, "Explica el motivo del ajuste"),
});

type FormData = z.infer<typeof schema>;

interface AjusteStockModalProps {
  open: boolean;
  onClose: () => void;
  producto: Producto | null;
  onSuccess: () => void;
}

export function AjusteStockModal({ open, onClose, producto, onSuccess }: AjusteStockModalProps) {
  const { add } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!producto) {
      reset({
        nuevo_stock: "",
        motivo: "",
      });
      return;
    }

    reset({
      nuevo_stock: String(producto.stock_actual ?? 0),
      motivo: "",
    });
  }, [producto, reset, open]);

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      productosApi.ajustarStock(producto!.id, {
        nuevo_stock: Number(values.nuevo_stock),
        motivo: values.motivo,
      }),
    onSuccess: () => {
      add("Stock actualizado.");
      onSuccess();
      onClose();
    },
    onError: (error) => add(getErrorMessage(error), "error"),
  });

  const nuevoStock = Number(watch("nuevo_stock") || 0);
  const stockActual = Number(producto?.stock_actual || 0);
  const diferencia = nuevoStock - stockActual;

  return (
    <Modal open={open} onClose={onClose} title="Ajustar stock" size="md">
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <p className="font-medium text-text">{producto?.nombre || "Producto"}</p>
          <p className="mt-1 text-sm text-text-muted">
            Stock actual: {stockActual.toLocaleString("es-AR")} {producto?.unidad || "unidad"}
          </p>
        </div>

        <Input
          label="Nuevo stock"
          type="number"
          min="0"
          step="0.01"
          error={errors.nuevo_stock?.message}
          {...register("nuevo_stock")}
        />

        <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-text-muted">
          Resultado del ajuste:{" "}
          <span className={diferencia > 0 ? "text-green-300" : diferencia < 0 ? "text-red-300" : "text-text"}>
            {diferencia > 0 ? "+" : ""}
            {diferencia.toLocaleString("es-AR")}
          </span>{" "}
          {producto?.unidad || "unidad"}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted">Motivo</label>
          <textarea
            rows={3}
            className="rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            placeholder="Ejemplo: conteo fisico, correccion por carga inicial, rotura o merma."
            {...register("motivo")}
          />
          {errors.motivo ? <span className="text-xs text-red-300">{errors.motivo.message}</span> : null}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Guardar ajuste
          </Button>
        </div>
      </form>
    </Modal>
  );
}
