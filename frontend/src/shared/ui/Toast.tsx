import clsx from "clsx";
import { AlertCircle, CheckCircle2, X, XCircle } from "lucide-react";
import { create } from "zustand";

type ToastType = "success" | "error" | "warning";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: ToastItem[];
  add: (message: string, type?: ToastType) => void;
  remove: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = "success") => {
    const id = Math.random().toString(36).slice(2);

    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));

    window.setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }));
    }, 4000);
  },
  remove: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));

export function ToastContainer() {
  const { toasts, remove } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            "flex min-w-80 items-center gap-3 rounded-xl border px-4 py-3 shadow-lg",
            {
              "border-green-500/30 bg-green-950/80 text-green-100": toast.type === "success",
              "border-red-500/30 bg-red-950/80 text-red-100": toast.type === "error",
              "border-yellow-500/30 bg-yellow-950/80 text-yellow-100": toast.type === "warning",
            }
          )}
        >
          {toast.type === "success" ? <CheckCircle2 size={18} /> : null}
          {toast.type === "error" ? <XCircle size={18} /> : null}
          {toast.type === "warning" ? <AlertCircle size={18} /> : null}
          <span className="flex-1 text-sm">{toast.message}</span>
          <button onClick={() => remove(toast.id)} className="text-current/80 transition hover:text-current">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
