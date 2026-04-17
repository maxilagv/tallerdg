import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ToastContainer } from "../shared/ui/Toast";
import { useAppNombre } from "../shared/hooks/useAppNombre";

export function Layout() {
  const appNombre = useAppNombre();

  useEffect(() => {
    document.title = appNombre;
  }, [appNombre]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
