"use client";

import { History, Search } from "lucide-react";
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
import { useInferenceHistory, useModels } from "@/lib/api/queries";

import {
  inferenceColumns,
  type InferenceHistoryRow,
} from "./inference-columns";

export function InferenceHistoryTable() {
  const router = useRouter();
  const { data, isPending, isError, error, refetch } = useInferenceHistory();
  const { data: models } = useModels();
  const [search, setSearch] = useState("");
  const [modelFilter, setModelFilter] = useState("all");

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const model of models ?? []) {
      map.set(model.modelId, model.displayName);
    }
    return map;
  }, [models]);

  const rows = useMemo<InferenceHistoryRow[]>(
    () =>
      (data ?? []).map((inference) => ({
        ...inference,
        modelName: nameById.get(inference.modelId) ?? inference.modelId,
      })),
    [data, nameById],
  );

  // Distinct models present in the history, for the filter dropdown.
  const modelOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of rows) {
      if (!seen.has(row.modelId)) {
        seen.set(row.modelId, row.modelName);
      }
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (modelFilter === "all" || row.modelId === modelFilter) &&
        (query === "" ||
          `${row.inferenceId} ${row.modelId} ${row.modelName}`
            .toLowerCase()
            .includes(query)),
    );
  }, [rows, search, modelFilter]);

  if (isError) {
    return (
      <ErrorState
        title="Could not load inference history"
        description={error.message}
        detail={error instanceof ApiError ? error.code : undefined}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const total = data?.length ?? 0;
  const historyIsEmpty = !isPending && total === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="sm:max-w-xs sm:flex-1">
          <Input
            type="search"
            icon={<Search />}
            placeholder="Search by inference ID or model..."
            aria-label="Search inferences"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="sm:w-56">
          <Select
            aria-label="Filter by model"
            value={modelFilter}
            onChange={(event) => setModelFilter(event.target.value)}
          >
            <option value="all">All models</option>
            {modelOptions.map(([modelId, modelName]) => (
              <option key={modelId} value={modelId}>
                {modelName}
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
          ariaLabel="Inference history"
          columns={inferenceColumns}
          data={filtered}
          isLoading={isPending}
          getRowId={(row) => row.inferenceId}
          onRowClick={(row) =>
            router.push(`/inference/${encodeURIComponent(row.inferenceId)}`)
          }
          initialSorting={[{ id: "createdAt", desc: true }]}
          empty={
            historyIsEmpty ? (
              <EmptyState
                icon={History}
                title="No inferences yet"
                description="Runs recorded by arc-model-lab will appear here. Start one in the Inference Lab."
              />
            ) : (
              <EmptyState
                icon={Search}
                title="No inferences match"
                description="No record matches the current search and model filter."
              />
            )
          }
        />
      </Panel>
    </div>
  );
}
