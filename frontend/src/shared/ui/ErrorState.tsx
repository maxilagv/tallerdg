import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "No se pudo cargar la información",
  description = "Ocurrió un error inesperado. Podés reintentar o volver.",
  backTo,
  backLabel = "Volver",
  onRetry,
}: ErrorStateProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
        <AlertCircle size={30} className="text-red-400" />
      </div>
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>

      <div className="mt-6 flex gap-2">
        <Button variant="secondary" onClick={() => (backTo ? navigate(backTo) : navigate(-1))}>
          <ArrowLeft size={15} /> {backLabel}
        </Button>
        {onRetry ? (
          <Button onClick={onRetry}>
            <RefreshCw size={15} /> Reintentar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
