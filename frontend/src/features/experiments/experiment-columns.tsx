import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import type { Experiment } from "@/lib/api/schemas";
import { formatDateTime, formatNumber } from "@/lib/format";

/** Columns for the experiments table. The name links to the detail page. */
export const experimentColumns: ColumnDef<Experiment>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/experiments/${encodeURIComponent(row.original.id)}`}
        className="font-medium text-text underline-offset-4 hover:text-accent hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "modelName",
    header: "Model",
    cell: ({ row }) => (
      <span className="text-text-muted">{row.original.modelName}</span>
    ),
  },
  {
    id: "temperature",
    header: "Temperature",
    accessorFn: (row) => row.generationConfig.temperature,
    cell: ({ row }) => (
      <span className="tabular-nums text-text-muted">
        {row.original.generationConfig.temperature.toFixed(2)}
      </span>
    ),
  },
  {
    id: "maxTokens",
    header: "Max tokens",
    accessorFn: (row) => row.generationConfig.maxOutputTokens,
    cell: ({ row }) => (
      <span className="tabular-nums text-text-muted">
        {formatNumber(row.original.generationConfig.maxOutputTokens)}
      </span>
    ),
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
];
