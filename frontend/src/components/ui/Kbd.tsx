import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * A keyboard-key hint. Used in the topbar command affordance and shortcut lists.
 * Monospaced so multi-key combos align.
 */
export function Kbd({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[var(--r-xs)]",
        "border border-border bg-surface-subtle px-1.5 font-mono text-[11px] text-text-muted",
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
