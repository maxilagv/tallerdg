import clsx from "clsx";

type BadgeVariant = "blue" | "green" | "yellow" | "red" | "gray" | "orange";

const variants: Record<BadgeVariant, string> = {
  blue: "border-blue-500/30 bg-blue-500/15 text-blue-300",
  green: "border-green-500/30 bg-green-500/15 text-green-300",
  yellow: "border-yellow-500/30 bg-yellow-500/15 text-yellow-300",
  red: "border-red-500/30 bg-red-500/15 text-red-300",
  gray: "border-slate-500/30 bg-slate-500/15 text-slate-300",
  orange: "border-orange-500/30 bg-orange-500/15 text-orange-300",
};

export function Badge({
  children,
  variant = "gray",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span className={clsx("rounded-full border px-2.5 py-1 text-xs font-medium", variants[variant])}>
      {children}
    </span>
  );
}
