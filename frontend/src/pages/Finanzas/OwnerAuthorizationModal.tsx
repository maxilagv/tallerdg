import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { authApi, type OwnerAuthorizationScope } from "../../features/auth/api";
import { Button } from "../../shared/ui/Button";
import { Modal } from "../../shared/ui/Modal";
import { getErrorMessage } from "../../shared/utils/errorMessage";

interface Props {
  open: boolean;
  scope: OwnerAuthorizationScope;
  title?: string;
  description?: string;
  onClose: () => void;
  onAuthorized: (token: string) => void;
}

// Modal de autorizacion del dueño/admin para acciones sensibles de caja.
// Pide credenciales de un usuario admin y obtiene un token corto (5 min)
// que se inyecta en la mutacion sensible. No reemplaza la sesion actual.
export function OwnerAuthorizationModal({
  open,
  scope,
  title = "Autorizacion del dueño",
  description = "Esta accion modifica la caja manualmente y necesita el visto bueno del dueño o un administrador.",
  onClose,
  onAuthorized,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Ingresa email y contraseña del dueño/admin.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await authApi.ownerAuthorization({
        email: email.trim(),
        password,
        scope,
      });
      onAuthorized(response.data.token);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={loading ? () => undefined : onClose} title={title} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
              <ShieldCheck size={18} className="text-amber-300" />
            </div>
            <p className="text-sm text-amber-100/90">{description}</p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">
            Email del dueño/admin
          </label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@tallerpro.com"
            autoFocus
            disabled={loading}
            className="w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contraseña del dueño/admin"
            disabled={loading}
            className="w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            required
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5">
            <p className="text-xs text-red-200">{error}</p>
          </div>
        )}

        <p className="text-[11px] text-text-muted">
          La autorizacion vale solo para esta accion y vence en 5 minutos.
        </p>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={loading}>
            Autorizar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
