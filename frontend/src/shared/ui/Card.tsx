import clsx from "clsx";

export function Card({
  children,
  className,
  padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-border bg-surface/95 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.5)]",
        padding && "p-5",
        className
      )}
    >
      {children}
    </div>
  );
}
