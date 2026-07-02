import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Small label above the title (e.g. the section name). */
  eyebrow?: ReactNode;
  /** Right-aligned actions (buttons, toggles). */
  actions?: ReactNode;
  className?: string;
}

/**
 * The standard page heading: eyebrow, title, description, and an actions slot.
 * Every route renders one so headings stay consistent and the content below can
 * assume a known top edge.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <div className="text-xs font-medium uppercase tracking-wider text-text-faint">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-lg font-semibold tracking-tight text-text">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
