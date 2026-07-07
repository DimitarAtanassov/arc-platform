import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import type { Model } from "@/lib/api/schemas";
import { EMPTY_VALUE, formatDate } from "@/lib/format";

import { ModelStatusBadge } from "./ModelStatusBadge";

function Mono({ value }: { value: string | null | undefined }) {
  if (!value) {
    return <span className="text-text-faint">{EMPTY_VALUE}</span>;
  }
  return <span className="font-mono text-[13px] text-text">{value}</span>;
}

/**
 * Columns for the model catalog. The name is the keyboard-accessible link to the
 * detail page (models are addressed by their unique name); ids and revisions
 * render in monospace. `accessorKey` drives sorting; cells read `row.original`.
 */
export const modelColumns: ColumnDef<Model>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/models/${encodeURIComponent(row.original.name)}`}
        className="font-medium text-text underline-offset-4 hover:text-accent hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "provider",
    header: "Provider",
    cell: ({ row }) => (
      <span className="text-text-muted">{row.original.provider}</span>
    ),
  },
  {
    accessorKey: "modelId",
    header: "Model ID",
    cell: ({ row }) => <Mono value={row.original.modelId} />,
  },
  {
    accessorKey: "tokenizerId",
    header: "Tokenizer",
    cell: ({ row }) => <Mono value={row.original.tokenizerId} />,
  },
  {
    accessorKey: "revision",
    header: "Revision",
    cell: ({ row }) => <Mono value={row.original.revision} />,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <ModelStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-text-muted">
        {formatDate(row.original.updatedAt)}
      </span>
    ),
  },
];
