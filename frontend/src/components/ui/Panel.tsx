import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** Optional header title. Renders the header row when set. */
  title?: ReactNode;
  /** Secondary line under the title. */
  description?: ReactNode;
  /** Right-aligned header controls (buttons, toggles). */
  actions?: ReactNode;
  /** Class applied to the content region rather than the outer frame. */
  contentClassName?: string;
  /** Remove content padding (for edge-to-edge tables). */
  flush?: boolean;
}

/**
 * The console's surface container: a bordered panel that lifts by luminance, not
 * shadow. An optional header carries a title, description, and actions. Content
 * padding is density-aware and can be flushed for full-bleed tables.
 */
export function Panel({
  title,
  description,
  actions,
  contentClassName,
  flush = false,
  className,
  children,
  ...props
}: PanelProps) {
  const hasHeader = title !== undefined || actions !== undefined;
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-surface",
        className,
      )}
      {...props}
    >
      {hasHeader ? (
        <header className="flex items-start justify-between gap-4 border-b border-border px-[var(--cell-pad-x)] py-3">
          <div className="min-w-0 space-y-0.5">
            {title !== undefined ? (
              <h2 className="truncate text-sm font-medium text-text">
                {title}
              </h2>
            ) : null}
            {description !== undefined ? (
              <p className="text-[13px] text-text-muted">{description}</p>
            ) : null}
          </div>
          {actions !== undefined ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </header>
      ) : null}
      <div
        className={cn(
          flush ? undefined : "p-[var(--cell-pad-x)]",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
