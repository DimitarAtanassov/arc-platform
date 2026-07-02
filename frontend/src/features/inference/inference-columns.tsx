import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import type { InferenceSummary } from "@/lib/api/schemas";
import { formatDateTime, formatLatency, formatNumber } from "@/lib/format";

import { InferenceStatusBadge } from "./InferenceStatusBadge";

/** A history row: the persisted summary plus a resolved model display name. */
export interface InferenceHistoryRow extends InferenceSummary {
  modelName: string;
}

/**
 * Columns for the inference history. The ID is the keyboard-accessible link to
 * the detail page; created and latency are sortable (accessorKey drives sort).
 */
export const inferenceColumns: ColumnDef<InferenceHistoryRow>[] = [
  {
    accessorKey: "inferenceId",
    header: "Inference ID",
    cell: ({ row }) => (
      <Link
        href={`/inference/${encodeURIComponent(row.original.inferenceId)}`}
        className="font-mono text-[13px] text-text underline-offset-4 hover:text-accent hover:underline"
      >
        {row.original.inferenceId}
      </Link>
    ),
  },
  {
    accessorKey: "modelName",
    header: "Model",
    cell: ({ row }) => (
      <span className="text-text-muted" title={row.original.modelId}>
        {row.original.modelName}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <InferenceStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-text-muted">
        {formatDateTime(row.original.createdAt)}
      </span>
    ),
  },
  {
    accessorKey: "latencyMs",
    header: "Latency",
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-data text-text-muted">
        {formatLatency(row.original.latencyMs)}
      </span>
    ),
  },
  {
    accessorKey: "totalTokens",
    header: "Tokens",
    cell: ({ row }) => (
      <span className="font-data text-text-muted">
        {formatNumber(row.original.totalTokens)}
      </span>
    ),
  },
  {
    accessorKey: "promptPreview",
    header: "Prompt",
    enableSorting: false,
    cell: ({ row }) => (
      <span
        className="block max-w-80 truncate text-text-muted"
        title={row.original.promptPreview}
      >
        {row.original.promptPreview}
      </span>
    ),
  },
];
