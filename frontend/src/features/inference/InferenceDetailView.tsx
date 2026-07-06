"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import {
  Button,
  CodeBlock,
  DescriptionList,
  ErrorState,
  LoadingState,
  Panel,
  Spinner,
} from "@/components/ui";
import { useEvaluateInference, useInference } from "@/lib/api/queries";
import { formatDateTime, formatLatency, formatNumber } from "@/lib/format";

import { MetricPicker } from "../shared/MetricPicker";
import { ScoreBadge } from "../shared/ScoreBadge";
import { useModelNames } from "../shared/model-names";

/** One persisted inference: its text, metadata, scores, and a re-evaluate action. */
export function InferenceDetailView({ inferenceId }: { inferenceId: string }) {
  const { data, isLoading, isError, refetch } = useInference(inferenceId);
  const modelName = useModelNames();
  const evaluate = useEvaluateInference();
  const [metrics, setMetrics] = useState<string[]>([]);

  if (isLoading) {
    return <LoadingState label="Loading inference..." />;
  }
  if (isError || !data) {
    return (
      <ErrorState
        title="Inference not found"
        description="This run does not exist or arc-model-lab is unavailable."
        onRetry={() => void refetch()}
      />
    );
  }

  const canEvaluate = metrics.length > 0 && !evaluate.isPending;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Metadata">
          <DescriptionList
            items={[
              { label: "Model", value: modelName(data.modelId) },
              { label: "Created", value: formatDateTime(data.createdAt) },
              { label: "Latency", value: formatLatency(data.latencyMs) },
              {
                label: "Prompt tokens",
                value: formatNumber(data.promptTokens),
              },
              {
                label: "Completion tokens",
                value: formatNumber(data.completionTokens),
              },
              { label: "Inference id", value: data.id, mono: true },
            ]}
          />
        </Panel>

        <Panel
          title="Evaluations"
          description="Metric scores recorded against this inference."
        >
          <div className="space-y-4">
            {data.evaluations.length === 0 ? (
              <p className="text-[13px] text-text-faint">
                Not evaluated yet. Choose metrics below to score it.
              </p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
                {data.evaluations.map((evaluation) => (
                  <li
                    key={`${evaluation.metricName}:${evaluation.evaluatorName}`}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-text">
                        {evaluation.metricName}
                      </div>
                      <div className="text-[11px] text-text-faint">
                        {evaluation.evaluatorName}
                        {evaluation.evaluatorVersion
                          ? ` · ${evaluation.evaluatorVersion}`
                          : ""}
                      </div>
                    </div>
                    <ScoreBadge score={evaluation.score} />
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-3 border-t border-border pt-4">
              <MetricPicker
                value={metrics}
                onChange={setMetrics}
                disabled={evaluate.isPending}
              />
              <div className="flex items-center justify-between gap-3">
                {evaluate.isError ? (
                  <span className="text-[12px] text-danger">
                    Evaluation failed.
                  </span>
                ) : (
                  <span />
                )}
                <Button
                  variant="outline"
                  onClick={() =>
                    evaluate.mutate({ inferenceId: data.id, metrics })
                  }
                  disabled={!canEvaluate}
                  className="gap-2"
                >
                  {evaluate.isPending ? (
                    <Spinner />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {evaluate.isPending ? "Scoring..." : "Evaluate"}
                </Button>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Input">
        <CodeBlock code={data.inputText} label="Input text" />
      </Panel>
      <Panel title="Prompt">
        <CodeBlock code={data.prompt} label="Rendered prompt" />
      </Panel>
      <Panel title="Output">
        <CodeBlock code={data.outputText} label="Model output" />
      </Panel>
    </div>
  );
}
