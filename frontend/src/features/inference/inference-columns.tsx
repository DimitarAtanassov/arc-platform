import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import type { InferenceSummary } from "@/lib/api/schemas";
import {
  EMPTY_VALUE,
  formatDateTime,
  formatLatency,
  formatNumber,
} from "@/lib/format";

function tokens(
  prompt: number | null | undefined,
  completion: number | null | undefined,
): string {
  if (prompt == null && completion == null) {
    return EMPTY_VALUE;
  }
  return `${formatNumber(prompt)} / ${formatNumber(completion)}`;
}

/**
 * Columns for the inference history table, parameterised by a model-name lookup
 * (rows carry a model UUID, not a name). The timestamp links to the detail page.
 */
export function inferenceColumns(
  modelName: (modelUuid: string) => string,
): ColumnDef<InferenceSummary>[] {
  return [
    {
      accessorKey: "createdAt",
      header: "When",
      cell: ({ row }) => (
        <Link
          href={`/inference/${encodeURIComponent(row.original.id)}`}
          className="whitespace-nowrap font-medium text-text underline-offset-4 hover:text-accent hover:underline"
        >
          {formatDateTime(row.original.createdAt)}
        </Link>
      ),
    },
    {
      id: "model",
      header: "Model",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-text-muted">
          {modelName(row.original.modelId)}
        </span>
      ),
    },
    {
      accessorKey: "inputPreview",
      header: "Input",
      cell: ({ row }) => (
        <span className="block max-w-72 truncate text-text">
          {row.original.inputPreview || EMPTY_VALUE}
        </span>
      ),
    },
    {
      accessorKey: "outputPreview",
      header: "Output",
      cell: ({ row }) => (
        <span className="block max-w-72 truncate text-text-muted">
          {row.original.outputPreview || EMPTY_VALUE}
        </span>
      ),
    },
    {
      accessorKey: "latencyMs",
      header: "Latency",
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums text-text-muted">
          {formatLatency(row.original.latencyMs)}
        </span>
      ),
    },
    {
      id: "tokens",
      header: "Tokens (in / out)",
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums text-text-muted">
          {tokens(row.original.promptTokens, row.original.completionTokens)}
        </span>
      ),
    },
  ];
}
