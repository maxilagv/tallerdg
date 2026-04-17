import { Button } from "./Button";

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
      {Icon ? <Icon size={40} className="mb-3 text-text-muted opacity-60" /> : null}
      <h3 className="text-base font-semibold text-text">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p> : null}
      {action ? (
        <Button className="mt-4" onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
