"use client";

import { ClipboardList } from "lucide-react";

import { DataTable, EmptyState, ErrorState } from "@/components/ui";
import { useEvalRequests } from "@/lib/api/queries";

import { requestColumns } from "./request-columns";

/** Interactions submitted to arc-eval-service for scoring, newest first. */
export function EvalRequestsTable() {
  const { data, isLoading, isError, refetch } = useEvalRequests();

  if (isError) {
    return (
      <ErrorState
        title="Could not load eval requests"
        description="arc-eval-service is unavailable right now."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <DataTable
      columns={requestColumns}
      data={data ?? []}
      isLoading={isLoading}
      getRowId={(request) => request.id}
      ariaLabel="Evaluation requests"
      empty={
        <EmptyState
          icon={ClipboardList}
          title="No evaluations recorded"
          description="Score an inference or run an experiment with metrics to populate this view."
        />
      }
    />
  );
}
