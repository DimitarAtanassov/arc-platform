"use client";

import { Play } from "lucide-react";
import { useState } from "react";

import {
  Button,
  CodeBlock,
  DescriptionList,
  ErrorState,
  LoadingState,
  Panel,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";
import {
  useCompareExperiments,
  useExperiment,
  useExperimentResults,
  useExperiments,
  useRunExperiment,
} from "@/lib/api/queries";
import type { ExperimentRunResponse } from "@/lib/api/schemas";
import { formatDateTime, formatNumber } from "@/lib/format";

import { EvaluationResults } from "../inference/EvaluationResults";
import { MetricPicker } from "../shared/MetricPicker";
import { ExperimentResultsTable } from "./ExperimentResultsTable";

/** One experiment: its config, a run form, aggregated results, and comparison. */
export function ExperimentDetailView({
  experimentId,
}: {
  experimentId: string;
}) {
  const experiment = useExperiment(experimentId);
  const results = useExperimentResults(experimentId);
  const run = useRunExperiment(experimentId);
  const allExperiments = useExperiments();

  const [inputText, setInputText] = useState("");
  const [metrics, setMetrics] = useState<string[]>([]);
  const [lastRun, setLastRun] = useState<ExperimentRunResponse | null>(null);
  const [otherId, setOtherId] = useState("");

  const comparison = useCompareExperiments(experimentId, otherId, otherId !== "");

  if (experiment.isLoading) {
    return <LoadingState label="Loading experiment..." />;
  }
  if (experiment.isError || !experiment.data) {
    return (
      <ErrorState
        title="Experiment not found"
        description="This experiment does not exist, or arc-model-lab is unavailable."
        onRetry={() => void experiment.refetch()}
      />
    );
  }

  const data = experiment.data;
  const canRun = inputText.trim() !== "" && !run.isPending;
  const others = (allExperiments.data ?? []).filter(
    (candidate) => candidate.id !== experimentId,
  );

  const onRun = () => {
    if (!canRun) {
      return;
    }
    run.mutate(
      {
        inputText: inputText.trim(),
        metrics: metrics.length > 0 ? metrics : undefined,
      },
      { onSuccess: (response) => setLastRun(response) },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Configuration">
          <DescriptionList
            items={[
              { label: "Name", value: data.name },
              {
                label: "Description",
                value: data.description ?? "—",
              },
              { label: "Model", value: data.modelName },
              {
                label: "Temperature",
                value: data.generationConfig.temperature.toFixed(2),
              },
              {
                label: "Max output tokens",
                value: formatNumber(data.generationConfig.maxOutputTokens),
              },
              { label: "Created", value: formatDateTime(data.createdAt) },
              { label: "Id", value: data.id, mono: true },
            ]}
          />
        </Panel>

        <Panel
          title="Run"
          description="Run this config once, scoring against the chosen metrics."
        >
          <div className="space-y-3">
            <Textarea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder="Input text for this run..."
              rows={4}
              disabled={run.isPending}
              aria-label="Run input text"
            />
            <MetricPicker
              value={metrics}
              onChange={setMetrics}
              disabled={run.isPending}
            />
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={onRun}
                disabled={!canRun}
                className="gap-2"
              >
                {run.isPending ? (
                  <Spinner className="text-on-accent" />
                ) : (
                  <Play className="size-4" />
                )}
                {run.isPending ? "Running..." : "Run"}
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      {lastRun ? (
        <Panel title="Last run" description="Output and score from the run above.">
          <div className="space-y-4">
            <CodeBlock code={lastRun.outputText} label="Run output" />
            {lastRun.evaluation ? (
              <EvaluationResults evaluation={lastRun.evaluation} />
            ) : (
              <p className="text-[13px] text-text-faint">
                No metrics were selected, so this run was not scored.
              </p>
            )}
          </div>
        </Panel>
      ) : null}

      <Panel
        title="Aggregated results"
        description="Average score per metric across every run of this experiment."
      >
        {results.isLoading ? (
          <LoadingState label="Loading results..." />
        ) : (
          <ExperimentResultsTable metrics={results.data?.metrics ?? []} />
        )}
      </Panel>

      <Panel
        title="Compare"
        description="Compare this experiment's scores against another."
      >
        <div className="space-y-4">
          <Select
            value={otherId}
            onChange={(event) => setOtherId(event.target.value)}
            className="max-w-sm"
            aria-label="Experiment to compare against"
          >
            <option value="">Select an experiment...</option>
            {others.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </Select>

          {otherId !== "" && comparison.data ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {comparison.data.experiments.map((entry, index) => (
                <div key={entry.experimentId} className="space-y-2">
                  <div className="text-[13px] font-medium text-text-muted">
                    {index === 0
                      ? data.name
                      : (others.find((candidate) => candidate.id === otherId)
                          ?.name ?? "Other")}
                  </div>
                  <ExperimentResultsTable metrics={entry.metrics} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
