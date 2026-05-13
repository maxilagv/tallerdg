import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Menu, Zap } from "lucide-react";
import { SearchBar } from "../features/busqueda/SearchBar";
import { useAuthStore } from "../shared/store/authStore";
import { RegistroExpressModal, type RegistroExpressResult } from "../pages/Ordenes/RegistroExpressModal";

export function Topbar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const empleado = useAuthStore((state) => state.empleado);
  const navigate = useNavigate();
  const [expressOpen, setExpressOpen] = useState(false);

  const handleRegistrado = ({ clienteId, vehiculoId, crearOrden }: RegistroExpressResult) => {
    if (crearOrden) {
      navigate(`/ordenes?nueva=1&clienteId=${clienteId}&vehiculoId=${vehiculoId}`);
    }
  };

  return (
    <>
      <header className="flex items-center gap-3 border-b border-border bg-surface/85 px-4 py-3 backdrop-blur md:gap-4 md:px-6">
        <button
          onClick={onMenuToggle}
          className="shrink-0 text-text-muted transition hover:text-text md:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="flex-1">
          <SearchBar />
        </div>

        <button
          onClick={() => setExpressOpen(true)}
          title="Ingreso rápido"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
        >
          <Zap size={13} />
          <span className="hidden sm:inline">Ingreso</span>
        </button>

        <button className="shrink-0 text-text-muted transition hover:text-text">
          <Bell size={18} />
        </button>
        <div className="hidden text-sm text-text-muted md:block">
          Hola, <span className="font-medium text-text">{empleado?.nombre}</span>
        </div>
      </header>

      <RegistroExpressModal
        open={expressOpen}
        onClose={() => setExpressOpen(false)}
        onRegistrado={handleRegistrado}
      />
    </>
  );
}
