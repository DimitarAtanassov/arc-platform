import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui";
import type { MetricScore } from "@/lib/api/schemas";
import { EMPTY_VALUE, formatDateTime } from "@/lib/format";

import { ScoreBadge } from "../shared/ScoreBadge";

function ShortId({ value }: { value: string | null | undefined }) {
  if (!value) {
    return <span className="text-text-faint">{EMPTY_VALUE}</span>;
  }
  return (
    <span title={value} className="font-mono text-[13px] text-text-muted">
      {value.slice(0, 8)}
    </span>
  );
}

/** Columns for the persisted metric-score browse table. */
export const resultColumns: ColumnDef<MetricScore>[] = [
  {
    accessorKey: "createdAt",
    header: "When",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-text-muted">
        {formatDateTime(row.original.createdAt)}
      </span>
    ),
  },
  {
    accessorKey: "metricName",
    header: "Metric",
    cell: ({ row }) => <span className="text-text">{row.original.metricName}</span>,
  },
  {
    accessorKey: "score",
    header: "Score",
    cell: ({ row }) => (
      <ScoreBadge score={row.original.score} passed={row.original.passed} />
    ),
  },
  {
    accessorKey: "passed",
    header: "Pass",
    cell: ({ row }) => (
      <Badge tone={row.original.passed ? "success" : "danger"}>
        {row.original.passed ? "pass" : "fail"}
      </Badge>
    ),
  },
  {
    accessorKey: "modelId",
    header: "Model",
    cell: ({ row }) => <ShortId value={row.original.modelId} />,
  },
  {
    accessorKey: "evaluatorName",
    header: "Evaluator",
    cell: ({ row }) => (
      <span className="text-text-muted">{row.original.evaluatorName}</span>
    ),
  },
];
