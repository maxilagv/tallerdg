import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Zap } from "lucide-react";
import { SearchBar } from "../features/busqueda/SearchBar";
import { useAuthStore } from "../shared/store/authStore";
import { RegistroExpressModal, type RegistroExpressResult } from "../pages/Ordenes/RegistroExpressModal";

export function Topbar() {
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
      <header className="flex items-center gap-4 border-b border-border bg-surface/85 px-6 py-3 backdrop-blur">
        <div className="flex-1">
          <SearchBar />
        </div>

        <button
          onClick={() => setExpressOpen(true)}
          title="Ingreso rápido"
          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
        >
          <Zap size={13} />
          Ingreso
        </button>

        <button className="text-text-muted transition hover:text-text">
          <Bell size={18} />
        </button>
        <div className="text-sm text-text-muted">
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
