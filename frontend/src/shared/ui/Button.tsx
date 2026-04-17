import clsx from "clsx";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition",
        "disabled:cursor-not-allowed disabled:opacity-60",
        {
          "bg-primary text-white hover:bg-primary-dark": variant === "primary",
          "border border-border bg-surface-3 text-text hover:bg-surface-2":
            variant === "secondary",
          "text-text-muted hover:bg-surface-3 hover:text-text": variant === "ghost",
          "bg-danger text-white hover:opacity-90": variant === "danger",
          "px-3 py-2 text-sm": size === "sm",
          "px-4 py-2.5 text-sm": size === "md",
          "px-5 py-3 text-base": size === "lg",
        },
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
      {children}
    </button>
  );
}
