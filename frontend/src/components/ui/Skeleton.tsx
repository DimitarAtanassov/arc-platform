import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * A shimmer placeholder for content that is loading. Purely decorative, so it is
 * hidden from assistive tech; wrap regions in a role="status" container instead.
 */
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-surface-raised", className)}
      {...props}
    />
  );
}
