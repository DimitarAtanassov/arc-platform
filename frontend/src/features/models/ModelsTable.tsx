"use client";

import { Boxes } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, EmptyState, ErrorState, Input } from "@/components/ui";
import { useModels } from "@/lib/api/queries";

import { modelColumns } from "./model-columns";

/**
 * The model catalog table. Filtering is a client-side substring match over the
 * name, provider, and model id, so the table stays a pure view over the cached
 * list; sorting is owned by the shared DataTable.
 */
export function ModelsTable() {
  const { data, isLoading, isError, refetch } = useModels();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const models = data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) {
      return models;
    }
    return models.filter((model) =>
      [model.name, model.provider, model.modelId].some((field) =>
        field.toLowerCase().includes(q),
      ),
    );
  }, [data, query]);

  if (isError) {
    return (
      <ErrorState
        title="Could not load models"
        description="The model catalog is unavailable right now."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-3">
      <Input
        type="search"
        placeholder="Filter by name, provider, or id..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="max-w-xs"
        aria-label="Filter models"
      />
      <DataTable
        columns={modelColumns}
        data={filtered}
        isLoading={isLoading}
        getRowId={(model) => model.id}
        ariaLabel="Model catalog"
        empty={
          <EmptyState
            icon={Boxes}
            title="No models in the catalog"
            description="Seed the arc-model-lab catalog to browse and run models here."
          />
        }
      />
    </div>
  );
}
