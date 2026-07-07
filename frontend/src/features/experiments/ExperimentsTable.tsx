"use client";

import { FlaskConical } from "lucide-react";

import { DataTable, EmptyState, ErrorState } from "@/components/ui";
import { useExperiments } from "@/lib/api/queries";

import { experimentColumns } from "./experiment-columns";

/** The experiments table, newest first. Rows link to the detail page. */
export function ExperimentsTable() {
  const { data, isLoading, isError, refetch } = useExperiments();

  if (isError) {
    return (
      <ErrorState
        title="Could not load experiments"
        description="arc-model-lab is unavailable right now."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <DataTable
      columns={experimentColumns}
      data={data ?? []}
      isLoading={isLoading}
      getRowId={(experiment) => experiment.id}
      ariaLabel="Experiments"
      empty={
        <EmptyState
          icon={FlaskConical}
          title="No experiments yet"
          description="Create an experiment to pin a model and decoding config, then run it."
        />
      }
    />
  );
}
