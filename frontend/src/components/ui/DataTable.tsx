"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Skeleton } from "./Skeleton";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Renders skeleton rows instead of data while true. */
  isLoading?: boolean;
  loadingRows?: number;
  /** Rendered in place of the body when there are no rows and not loading. */
  empty?: ReactNode;
  /** Mouse convenience: click anywhere on a row (except links/buttons) to act. */
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string;
  initialSorting?: SortingState;
  ariaLabel?: string;
}

/**
 * The shared, table-first data grid. Owns sorting; filtering is the caller's job
 * (pass already-filtered data) so the table stays generic. Rows can carry a
 * keyboard-accessible link in a cell and still support whole-row click for mice.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  loadingRows = 8,
  empty,
  onRowClick,
  getRowId,
  initialSorting = [],
  ariaLabel,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
  });

  const rows = table.getRowModel().rows;
  const columnCount = table.getAllLeafColumns().length;

  return (
    <div className="overflow-x-auto">
      <table
        aria-label={ariaLabel}
        className="w-full border-collapse text-sm tabular-nums"
      >
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    scope="col"
                    className="whitespace-nowrap px-[var(--cell-pad-x)] py-2.5 text-left align-middle text-[11px] font-medium uppercase tracking-wider text-text-faint"
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 transition-colors hover:text-text-muted"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {sorted === "asc" ? (
                          <ChevronUp className="size-3.5" />
                        ) : sorted === "desc" ? (
                          <ChevronDown className="size-3.5" />
                        ) : (
                          <ChevronsUpDown className="size-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: loadingRows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border">
                {Array.from({ length: columnCount }).map((_, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-[var(--cell-pad-x)] py-[var(--row-pad-y)]"
                  >
                    <Skeleton className="h-4 w-full max-w-32" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="p-0">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                onClick={
                  onRowClick
                    ? (event) => {
                        // Let real interactive elements (the row's link) win.
                        if ((event.target as HTMLElement).closest("a,button")) {
                          return;
                        }
                        onRowClick(row.original);
                      }
                    : undefined
                }
                className={cn(
                  "border-b border-border transition-colors",
                  onRowClick && "cursor-pointer hover:bg-surface-raised",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-[var(--cell-pad-x)] py-[var(--row-pad-y)] align-middle"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
