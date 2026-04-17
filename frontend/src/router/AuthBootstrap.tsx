import { useEffect } from "react";
import { authApi } from "../features/auth/api";
import { useAuthStore } from "../shared/store/authStore";
import { useAppNombre } from "../shared/hooks/useAppNombre";

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const setSession = useAuthStore((state) => state.setSession);
  const markUnauthenticated = useAuthStore((state) => state.markUnauthenticated);
  const startChecking = useAuthStore((state) => state.startChecking);
  const appNombre = useAppNombre();

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      startChecking();

      try {
        const { data } = await authApi.refresh();

        if (!isMounted) {
          return;
        }

        setSession(data.accessToken, data.empleado);
      } catch (error) {
        if (isMounted) {
          markUnauthenticated();
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [markUnauthenticated, setSession, startChecking]);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        Preparando {appNombre}...
      </div>
    );
  }

  return <>{children}</>;
}
