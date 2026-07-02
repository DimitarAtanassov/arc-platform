import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Optional Lucide icon component. */
  icon?: ComponentType<{ className?: string }>;
  title: ReactNode;
  description?: ReactNode;
  /** A primary action (e.g. a button or link). */
  action?: ReactNode;
  className?: string;
}

/**
 * The canonical "nothing here yet" surface. A dashed frame signals absence
 * honestly rather than faking content. Used for empty tables and unbuilt
 * capabilities alike.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border",
        "bg-surface-subtle px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="size-6 text-text-faint" /> : null}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-text">{title}</h3>
        {description ? (
          <p className="mx-auto max-w-sm text-[13px] text-text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
