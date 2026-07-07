"use client";

import {
  CodeBlock,
  DataTable,
  DescriptionList,
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
} from "@/components/ui";
import { useEvalRequest } from "@/lib/api/queries";
import { EMPTY_VALUE, formatDateTime } from "@/lib/format";

import { resultColumns } from "./result-columns";

/** One eval request: the scored interaction and every metric score against it. */
export function EvalRequestDetailView({ requestId }: { requestId: string }) {
  const { data, isLoading, isError, refetch } = useEvalRequest(requestId);

  if (isLoading) {
    return <LoadingState label="Loading evaluation..." />;
  }
  if (isError || !data) {
    return (
      <ErrorState
        title="Evaluation not found"
        description="This eval request does not exist, or arc-eval-service is unavailable."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Panel title="Request">
        <DescriptionList
          items={[
            { label: "Created", value: formatDateTime(data.createdAt) },
            {
              label: "Inference id",
              value: data.inferenceId ?? EMPTY_VALUE,
              mono: true,
            },
            {
              label: "Model id",
              value: data.modelId ?? EMPTY_VALUE,
              mono: true,
            },
            { label: "Request id", value: data.id, mono: true },
          ]}
        />
      </Panel>

      <Panel title="Scores" flush>
        {data.results.length === 0 ? (
          <EmptyState
            title="No scores"
            description="This request has no recorded metric scores."
            className="m-4"
          />
        ) : (
          <DataTable
            columns={resultColumns}
            data={data.results}
            getRowId={(result) => result.id}
            ariaLabel="Metric scores for this request"
          />
        )}
      </Panel>

      <Panel title="Input">
        <CodeBlock code={data.inputText} label="Input text" />
      </Panel>
      <Panel title="Output">
        <CodeBlock code={data.outputText} label="Output text" />
      </Panel>
      {data.prompt ? (
        <Panel title="Prompt">
          <CodeBlock code={data.prompt} label="Rendered prompt" />
        </Panel>
      ) : null}
    </div>
  );
}
