"use client";

import { Boxes, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  Panel,
  Select,
} from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { useModels } from "@/lib/api/queries";
import type { ModelStatus, ModelSummary } from "@/lib/api/schemas";

import { modelColumns } from "./model-columns";

type StatusFilter = ModelStatus | "all";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "available", label: "Available" },
  { value: "preview", label: "Preview" },
  { value: "deprecated", label: "Deprecated" },
  { value: "retired", label: "Retired" },
];

function matchesQuery(model: ModelSummary, query: string): boolean {
  const haystack = [
    model.displayName,
    model.provider,
    model.modelId,
    model.tokenizerId,
    model.revision,
    model.adapterPath,
    model.family,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function ModelsTable() {
  const router = useRouter();
  const { data, isPending, isError, error, refetch } = useModels();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const models = data ?? [];
    const query = search.trim().toLowerCase();
    return models.filter(
      (model) =>
        (status === "all" || model.status === status) &&
        (query === "" || matchesQuery(model, query)),
    );
  }, [data, search, status]);

  if (isError) {
    return (
      <ErrorState
        title="Could not load models"
        description={error.message}
        detail={error instanceof ApiError ? error.code : undefined}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const total = data?.length ?? 0;
  const catalogIsEmpty = !isPending && total === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="sm:max-w-xs sm:flex-1">
          <Input
            type="search"
            icon={<Search />}
            placeholder="Search name, ID, tokenizer, adapter..."
            aria-label="Search models"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="sm:w-52">
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="font-data text-[13px] text-text-faint sm:ml-auto">
          {filtered.length} of {total}
        </div>
      </div>

      <Panel flush>
        <DataTable
          ariaLabel="Models"
          columns={modelColumns}
          data={filtered}
          isLoading={isPending}
          getRowId={(model) => model.modelId}
          onRowClick={(model) =>
            router.push(`/models/${encodeURIComponent(model.modelId)}`)
          }
          initialSorting={[{ id: "provider", desc: false }]}
          empty={
            catalogIsEmpty ? (
              <EmptyState
                icon={Boxes}
                title="No models in the catalog"
                description="arc-model-lab returned no models, or it is unreachable. Nothing is stored here to fall back on."
              />
            ) : (
              <EmptyState
                icon={Search}
                title="No models match"
                description="No model matches the current search and status filter."
              />
            )
          }
        />
      </Panel>
    </div>
  );
}
