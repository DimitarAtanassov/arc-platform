import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  /**
   * Accessible label. When provided the spinner announces itself as a status;
   * when omitted it is decorative (wrap it in a role="status" region instead, as
   * LoadingState does) so nested spinners never announce twice.
   */
  label?: string;
}

/** A single indeterminate progress indicator. */
export function Spinner({ className, label }: SpinnerProps) {
  const decorative = label === undefined;
  return (
    <Loader2
      role={decorative ? undefined : "status"}
      aria-hidden={decorative || undefined}
      aria-label={label}
      className={cn("size-4 animate-spin text-text-muted", className)}
    />
  );
}
