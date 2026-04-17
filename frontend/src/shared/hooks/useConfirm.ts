import { useCallback, useState } from "react";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions;
  resolve: ((value: boolean) => void) | null;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    options: { title: "" },
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState((current) => ({
      ...current,
      open: false,
      resolve: null,
    }));
  }, [state]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState((current) => ({
      ...current,
      open: false,
      resolve: null,
    }));
  }, [state]);

  return {
    confirm,
    confirmModalProps: {
      open: state.open,
      title: state.options.title,
      description: state.options.description,
      confirmLabel: state.options.confirmLabel,
      variant: state.options.variant,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}
