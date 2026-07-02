import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface DescriptionItem {
  label: string;
  value: ReactNode;
  /** Render the value in monospace (IDs, paths, revisions). */
  mono?: boolean;
}

interface DescriptionListProps {
  items: DescriptionItem[];
  className?: string;
}

/**
 * A key/value metadata list (dl/dt/dd). Two columns on wide viewports, stacked
 * on narrow ones. Values can opt into monospace for IDs and paths.
 */
export function DescriptionList({ items, className }: DescriptionListProps) {
  return (
    <dl className={cn("divide-y divide-border", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-4"
        >
          <dt className="text-[13px] text-text-muted">{item.label}</dt>
          <dd
            className={cn(
              "min-w-0 break-words text-sm text-text",
              item.mono && "font-mono text-[13px]",
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
