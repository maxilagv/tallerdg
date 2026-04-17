import { Navigate } from "react-router-dom";
import { useAuthStore } from "../shared/store/authStore";

function FullscreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center text-text-muted">
      Cargando sesión...
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken, status } = useAuthStore();

  if (status === "checking") {
    return <FullscreenLoader />;
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
