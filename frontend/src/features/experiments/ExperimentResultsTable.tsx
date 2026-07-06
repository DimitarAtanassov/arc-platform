import { BarChart3 } from "lucide-react";

import { EmptyState } from "@/components/ui";
import type { MetricAggregate } from "@/lib/api/schemas";
import { formatNumber, formatScore } from "@/lib/format";

/** Aggregated metric scores for an experiment: average and count per metric. */
export function ExperimentResultsTable({
  metrics,
}: {
  metrics: MetricAggregate[];
}) {
  if (metrics.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No scores yet"
        description="Run this experiment with metrics selected to aggregate scores."
      />
    );
  }

  return (
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-text-faint">
          <th className="py-2 pr-4 font-medium">Metric</th>
          <th className="py-2 pr-4 font-medium">Average</th>
          <th className="py-2 font-medium">Runs</th>
        </tr>
      </thead>
      <tbody>
        {metrics.map((metric) => (
          <tr key={metric.metricName} className="border-b border-border">
            <td className="py-2 pr-4 text-text">{metric.metricName}</td>
            <td className="py-2 pr-4 text-text">
              {formatScore(metric.averageScore)}
            </td>
            <td className="py-2 text-text-muted">
              {formatNumber(metric.evaluatedCount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
