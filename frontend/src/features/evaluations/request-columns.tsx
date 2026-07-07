import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import type { EvalRequestSummary } from "@/lib/api/schemas";
import { EMPTY_VALUE, formatDateTime } from "@/lib/format";

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

/** Columns for the eval-request browse table. The timestamp links to the detail. */
export const requestColumns: ColumnDef<EvalRequestSummary>[] = [
  {
    accessorKey: "createdAt",
    header: "When",
    cell: ({ row }) => (
      <Link
        href={`/evaluations/requests/${encodeURIComponent(row.original.id)}`}
        className="whitespace-nowrap font-medium text-text underline-offset-4 hover:text-accent hover:underline"
      >
        {formatDateTime(row.original.createdAt)}
      </Link>
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
    accessorKey: "modelId",
    header: "Model",
    cell: ({ row }) => <ShortId value={row.original.modelId} />,
  },
  {
    accessorKey: "inferenceId",
    header: "Inference",
    cell: ({ row }) => <ShortId value={row.original.inferenceId} />,
  },
];
