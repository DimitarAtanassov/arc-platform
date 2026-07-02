import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Spinner } from "./Spinner";

interface LoadingStateProps {
  label?: ReactNode;
  className?: string;
}

/**
 * The canonical busy surface: a centered spinner with a label, announced as a
 * live status region. For content-shaped placeholders, compose Skeleton instead.
 */
export function LoadingState({
  label = "Loading",
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(
        "flex items-center justify-center gap-2 px-6 py-14 text-sm text-text-muted",
        className,
      )}
    >
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
