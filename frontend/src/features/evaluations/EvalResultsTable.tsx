"use client";

import { ClipboardCheck } from "lucide-react";
import { useState } from "react";

import { DataTable, EmptyState, ErrorState, Select } from "@/components/ui";
import { useEvalResults, useMetrics } from "@/lib/api/queries";

import { resultColumns } from "./result-columns";

/** Persisted metric scores, newest first, with an optional metric filter. */
export function EvalResultsTable() {
  const [metric, setMetric] = useState("");
  const metrics = useMetrics();
  const { data, isLoading, isError, refetch } = useEvalResults({
    metric: metric === "" ? null : metric,
  });

  if (isError) {
    return (
      <ErrorState
        title="Could not load results"
        description="arc-eval-service is unavailable right now."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-3">
      <Select
        value={metric}
        onChange={(event) => setMetric(event.target.value)}
        className="max-w-xs"
        aria-label="Filter by metric"
      >
        <option value="">All metrics</option>
        {(metrics.data ?? []).map((definition) => (
          <option key={definition.name} value={definition.name}>
            {definition.name}
          </option>
        ))}
      </Select>
      <DataTable
        columns={resultColumns}
        data={data ?? []}
        isLoading={isLoading}
        getRowId={(result) => result.id}
        ariaLabel="Evaluation results"
        empty={
          <EmptyState
            icon={ClipboardCheck}
            title="No scores recorded"
            description="Metric scores appear here once inferences or experiment runs are evaluated."
          />
        }
      />
    </div>
  );
}
