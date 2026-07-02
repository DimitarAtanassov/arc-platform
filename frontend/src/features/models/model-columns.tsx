import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import type { ModelSummary } from "@/lib/api/schemas";
import { EMPTY_VALUE, formatDate } from "@/lib/format";

import { ModelStatusBadge } from "./ModelStatusBadge";

function Mono({ value }: { value: string | null | undefined }) {
  if (!value) {
    return <span className="text-text-faint">{EMPTY_VALUE}</span>;
  }
  return <span className="font-mono text-[13px] text-text">{value}</span>;
}

/**
 * Column definitions for the model catalog. IDs, tokenizer, revision, and
 * adapter path render in monospace; the name is the keyboard-accessible link to
 * the detail page. `accessorKey` drives sorting; cells read `row.original` for
 * type safety.
 */
export const modelColumns: ColumnDef<ModelSummary>[] = [
  {
    accessorKey: "displayName",
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/models/${encodeURIComponent(row.original.modelId)}`}
        className="font-medium text-text underline-offset-4 hover:text-accent hover:underline"
      >
        {row.original.displayName}
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
    accessorKey: "adapterPath",
    header: "Adapter",
    cell: ({ row }) => {
      const value = row.original.adapterPath;
      if (!value) {
        return <span className="text-text-faint">{EMPTY_VALUE}</span>;
      }
      return (
        <span
          title={value}
          className="block max-w-64 truncate font-mono text-[13px] text-text"
        >
          {value}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <ModelStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-text-muted">
        {formatDate(row.original.createdAt)}
      </span>
    ),
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
