"use client";

import { History } from "lucide-react";
import { useMemo } from "react";

import { DataTable, EmptyState, ErrorState } from "@/components/ui";
import { useInferenceHistory } from "@/lib/api/queries";

import { useModelNames } from "../shared/model-names";
import { inferenceColumns } from "./inference-columns";

/** The recent inference history, newest first. Rows link to the detail page. */
export function InferenceHistoryTable() {
  const { data, isLoading, isError, refetch } = useInferenceHistory();
  const modelName = useModelNames();
  const columns = useMemo(() => inferenceColumns(modelName), [modelName]);

  if (isError) {
    return (
      <ErrorState
        title="Could not load inference history"
        description="arc-model-lab is unavailable right now."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      isLoading={isLoading}
      getRowId={(inference) => inference.id}
      ariaLabel="Inference history"
      empty={
        <EmptyState
          icon={History}
          title="No inferences yet"
          description="Run a model in the Inference Lab to see runs recorded here."
        />
      }
    />
  );
}
