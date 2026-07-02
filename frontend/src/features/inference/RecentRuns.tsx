"use client";

import { ArrowUpRight, History } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/ui";
import type { InferenceDetail } from "@/lib/api/schemas";
import { formatDateTime, formatLatency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import { InferenceStatusBadge } from "./InferenceStatusBadge";

interface RecentRunsProps {
  runs: InferenceDetail[];
  onSelect: (run: InferenceDetail) => void;
  activeId?: string | null;
}

/**
 * A session log of runs made in this tab. Entries are the real records the BFF
 * returned (no fakes, no server refetch). Selecting one reloads it into the
 * output panel; the arrow opens its full detail.
 */
export function RecentRuns({ runs, onSelect, activeId }: RecentRunsProps) {
  if (runs.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No runs yet this session"
        description="Runs you start here appear in this log with their real returned metadata."
        className="border-0 bg-transparent py-8"
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {runs.map((run) => {
        const active = run.inferenceId === activeId;
        return (
          <li key={run.inferenceId} className="flex items-center gap-2 py-1.5">
            <button
              type="button"
              onClick={() => onSelect(run)}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-raised",
                active && "bg-accent-muted",
              )}
            >
              <InferenceStatusBadge status={run.status} />
              <div className="min-w-0">
                <div className="truncate font-mono text-xs text-text">
                  {run.inferenceId}
                </div>
                <div className="truncate text-[11px] text-text-faint">
                  {run.modelId} · {formatDateTime(run.createdAt)}
                </div>
              </div>
              <div className="ml-auto shrink-0 pl-3 font-data text-[11px] text-text-muted">
                {formatLatency(run.latencyMs)} ·{" "}
                {formatNumber(run.usage?.totalTokens ?? run.totalTokens)} tok
              </div>
            </button>
            <Link
              href={`/inference/${encodeURIComponent(run.inferenceId)}`}
              aria-label={`Open detail for ${run.inferenceId}`}
              className="shrink-0 rounded-md p-1.5 text-text-faint transition-colors hover:bg-surface-raised hover:text-text"
            >
              <ArrowUpRight className="size-4" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
