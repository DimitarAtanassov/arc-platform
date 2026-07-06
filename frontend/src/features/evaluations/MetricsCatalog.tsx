"use client";

import { ClipboardCheck } from "lucide-react";

import { Badge, EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { useMetrics } from "@/lib/api/queries";
import { formatScore } from "@/lib/format";

/** The metric catalog arc-eval-service can score against. */
export function MetricsCatalog() {
  const { data, isLoading, isError, refetch } = useMetrics();

  if (isLoading) {
    return <LoadingState label="Loading metrics..." />;
  }
  if (isError) {
    return (
      <ErrorState
        title="Could not load metrics"
        description="arc-eval-service is unavailable right now."
        onRetry={() => void refetch()}
      />
    );
  }
  if ((data ?? []).length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="No metrics defined"
        description="The arc-eval-service catalog is empty or unreachable."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {(data ?? []).map((metric) => (
        <div
          key={metric.name}
          className="space-y-2 rounded-lg border border-border bg-surface p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-text">{metric.name}</span>
            <div className="flex items-center gap-1.5">
              <Badge tone="neutral">{metric.version}</Badge>
              <Badge tone="accent">threshold {formatScore(metric.threshold)}</Badge>
            </div>
          </div>
          <p className="text-[13px] leading-relaxed text-text-muted">
            {metric.rubric}
          </p>
          {metric.requires.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] uppercase tracking-wider text-text-faint">
                Requires
              </span>
              {metric.requires.map((field) => (
                <span
                  key={field}
                  className="rounded-md border border-border bg-surface-subtle px-1.5 py-0.5 font-mono text-[11px] text-text-muted"
                >
                  {field}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
