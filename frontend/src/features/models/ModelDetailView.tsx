"use client";

import { History } from "lucide-react";
import { useMemo } from "react";

import {
  DataTable,
  DescriptionList,
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
} from "@/components/ui";
import { useModel, useModelInferences } from "@/lib/api/queries";
import { EMPTY_VALUE, formatDateTime } from "@/lib/format";

import { inferenceColumns } from "../inference/inference-columns";
import { ModelStatusBadge } from "./ModelStatusBadge";

/** One catalog model: its metadata and the recent inferences run against it. */
export function ModelDetailView({ name }: { name: string }) {
  const { data, isLoading, isError, refetch } = useModel(name);
  const runs = useModelInferences(data?.id ?? "");
  const columns = useMemo(() => inferenceColumns(() => name), [name]);

  if (isLoading) {
    return <LoadingState label="Loading model..." />;
  }
  if (isError || !data) {
    return (
      <ErrorState
        title="Model not found"
        description="This model is not in the catalog, or arc-model-lab is unavailable."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Panel title="Model">
        <DescriptionList
          items={[
            { label: "Name", value: data.name },
            {
              label: "Status",
              value: <ModelStatusBadge status={data.status} />,
            },
            { label: "Provider", value: data.provider },
            { label: "Model ID", value: data.modelId, mono: true },
            { label: "Tokenizer", value: data.tokenizerId, mono: true },
            {
              label: "Revision",
              value: data.revision ?? EMPTY_VALUE,
              mono: true,
            },
            {
              label: "Adapter",
              value: data.adapterPath ?? EMPTY_VALUE,
              mono: true,
            },
            { label: "Created", value: formatDateTime(data.createdAt) },
            { label: "Updated", value: formatDateTime(data.updatedAt) },
            { label: "Id", value: data.id, mono: true },
          ]}
        />
      </Panel>

      <Panel
        title="Recent inferences"
        description="Runs recorded against this model."
        flush
      >
        <DataTable
          columns={columns}
          data={runs.data ?? []}
          isLoading={runs.isLoading}
          getRowId={(inference) => inference.id}
          ariaLabel="Recent inferences for this model"
          empty={
            <EmptyState
              icon={History}
              title="No runs yet"
              description="Run this model in the Inference Lab to see history here."
            />
          }
        />
      </Panel>
    </div>
  );
}
