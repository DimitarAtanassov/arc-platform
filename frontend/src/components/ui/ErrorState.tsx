import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Button } from "./Button";

interface ErrorStateProps {
  title?: ReactNode;
  description?: ReactNode;
  /** A short, safe error detail (e.g. a code or upstream status). No stack traces. */
  detail?: string;
  /** When provided, renders a retry control wired to this handler. */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * The canonical failure surface. Danger-toned but calm — it states what failed
 * and offers a single recovery action. Detail is for a short code or message,
 * never a stack trace.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "The request could not be completed.",
  detail,
  onRetry,
  retryLabel = "Try again",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border",
        "border-[var(--danger-border)] bg-danger-soft px-6 py-14 text-center",
        className,
      )}
    >
      <TriangleAlert className="size-6 text-danger" aria-hidden />
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-text">{title}</h3>
        {description ? (
          <p className="mx-auto max-w-sm text-[13px] text-text-muted">
            {description}
          </p>
        ) : null}
        {detail ? (
          <p className="mx-auto max-w-sm truncate pt-1 font-mono text-[11px] text-text-faint">
            {detail}
          </p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="subtle" size="sm" onClick={onRetry} className="mt-1">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
