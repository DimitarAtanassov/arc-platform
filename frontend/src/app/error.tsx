"use client";

import { useEffect } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState } from "@/components/ui";

/**
 * Route-level error boundary. Renders inside the shell so navigation stays
 * usable. Shows only a safe digest, never a stack trace, and offers a retry.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error to the console for local debugging.
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Error"
        title="Something went wrong"
        description="An unexpected error occurred while rendering this page."
      />
      <ErrorState
        title="This page failed to load"
        description="You can retry, or head back to the overview."
        detail={error.digest}
        onRetry={reset}
      />
    </div>
  );
}
