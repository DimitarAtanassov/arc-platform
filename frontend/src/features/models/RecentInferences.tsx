"use client";

import { History } from "lucide-react";

import { Badge, EmptyState, Spinner } from "@/components/ui";
import { useModelInferences } from "@/lib/api/queries";
import type { InferenceStatus } from "@/lib/api/schemas";
import { formatDateTime, formatLatency } from "@/lib/format";

type Tone = "success" | "danger" | "info" | "neutral";

const STATUS_TONE: Record<InferenceStatus, Tone> = {
  succeeded: "success",
  failed: "danger",
  running: "info",
  queued: "neutral",
};

/**
 * Recent inference runs for one model. A per-model endpoint does not exist yet,
 * so this narrows the recent-history read client-side. It renders real data or
 * an honest empty state, never a placeholder metric.
 */
export function RecentInferences({ modelId }: { modelId: string }) {
  const { data, isPending, isError } = useModelInferences(modelId);

  if (isPending) {
    return (
      <div className="flex justify-center py-6">
        <Spinner label="Loading recent inferences" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-4 text-[13px] text-text-muted">
        Could not load recent inferences.
      </p>
    );
  }

  const inferences = data ?? [];

  if (inferences.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No recent inferences"
        description="Runs for this model will appear here once they exist."
        className="border-0 bg-transparent py-8"
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {inferences.slice(0, 8).map((inference) => (
        <li
          key={inference.inferenceId}
          className="flex items-center justify-between gap-3 py-2.5"
        >
          <div className="min-w-0">
            <div className="truncate font-mono text-xs text-text">
              {inference.inferenceId}
            </div>
            <div className="text-[11px] text-text-faint">
              {formatDateTime(inference.createdAt)}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-data text-[11px] text-text-muted">
              {formatLatency(inference.latencyMs)}
            </span>
            <Badge tone={STATUS_TONE[inference.status]}>
              {inference.status}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
