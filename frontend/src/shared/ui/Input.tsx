import clsx from "clsx";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? <label className="text-sm font-medium text-text-muted">{label}</label> : null}
      <input
        ref={ref}
        className={clsx(
          "rounded-xl border bg-surface-3 px-3 py-2.5 text-sm text-text outline-none transition",
          "placeholder:text-text-muted focus:border-primary",
          error ? "border-danger" : "border-border",
          className
        )}
        {...props}
      />
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
    </div>
  );
});
