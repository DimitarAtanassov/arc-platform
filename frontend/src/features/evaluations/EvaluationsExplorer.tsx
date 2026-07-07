"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { EvalRequestsTable } from "./EvalRequestsTable";
import { EvalResultsTable } from "./EvalResultsTable";
import { MetricsCatalog } from "./MetricsCatalog";

type Tab = "requests" | "results" | "metrics";

const TABS: { id: Tab; label: string }[] = [
  { id: "requests", label: "Requests" },
  { id: "results", label: "Results" },
  { id: "metrics", label: "Metrics" },
];

/**
 * The arc-eval-service data browser: submitted interactions, the metric scores
 * recorded against them, and the metric catalog, behind a simple tab set.
 */
export function EvaluationsExplorer() {
  const [tab, setTab] = useState<Tab>("requests");

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Evaluation views"
        className="flex gap-1 border-b border-border"
      >
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            onClick={() => setTab(entry.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              tab === entry.id
                ? "border-accent font-medium text-text"
                : "border-transparent text-text-muted hover:text-text",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "requests" ? <EvalRequestsTable /> : null}
      {tab === "results" ? <EvalResultsTable /> : null}
      {tab === "metrics" ? <MetricsCatalog /> : null}
    </div>
  );
}
