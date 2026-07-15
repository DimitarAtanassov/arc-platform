"use client";

import { Play, Plus } from "lucide-react";
import { useState } from "react";

import {
  Button,
  DescriptionList,
  ErrorState,
  Input,
  LoadingState,
  Panel,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";
import {
  useAddDataset,
  useCompareExperiments,
  useExperiment,
  useExperimentDataset,
  useExperimentResults,
  useExperiments,
  useRunExperiment,
} from "@/lib/api/queries";
import type { ExperimentRunResponse } from "@/lib/api/schemas";
import { formatDateTime, formatNumber } from "@/lib/format";

import { ExperimentResultsTable } from "./ExperimentResultsTable";

/**
 * One experiment: an overview, a dataset builder, a run over the dataset,
 * aggregated results, and comparison against another experiment.
 */
export function ExperimentDetailView({
  experimentId,
}: {
  experimentId: string;
}) {
  const experiment = useExperiment(experimentId);
  const dataset = useExperimentDataset(experimentId);
  const results = useExperimentResults(experimentId);
  const run = useRunExperiment(experimentId);
  const addDataset = useAddDataset(experimentId);
  const allExperiments = useExperiments();

  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [systemText, setSystemText] = useState("");
  const [lastRun, setLastRun] = useState<ExperimentRunResponse | null>(null);
  const [otherId, setOtherId] = useState("");

  const comparison = useCompareExperiments(
    experimentId,
    otherId,
    otherId !== "",
  );

  if (experiment.isLoading) {
    return <LoadingState label="Loading experiment..." />;
  }
  if (experiment.isError || !experiment.data) {
    return (
      <ErrorState
        title="Experiment not found"
        description="This experiment does not exist, or arc-eval-service is unavailable."
        onRetry={() => void experiment.refetch()}
      />
    );
  }

  const data = experiment.data;
  const datasetSize = dataset.data?.length ?? data.datasetSize;
  const canAdd =
    inputText.trim() !== "" &&
    outputText.trim() !== "" &&
    !addDataset.isPending;
  const canRun = datasetSize > 0 && !run.isPending;
  const others = (allExperiments.data ?? []).filter(
    (candidate) => candidate.id !== experimentId,
  );

  const nameFor = (id: string): string =>
    id === experimentId
      ? data.name
      : ((allExperiments.data ?? []).find((entry) => entry.id === id)?.name ??
        id);

  const onAdd = () => {
    if (!canAdd) {
      return;
    }
    addDataset.mutate(
      [
        {
          inputText: inputText.trim(),
          outputText: outputText.trim(),
          systemText: systemText.trim() === "" ? null : systemText.trim(),
        },
      ],
      {
        onSuccess: () => {
          setInputText("");
          setOutputText("");
          setSystemText("");
        },
      },
    );
  };

  const onRun = () => {
    if (!canRun) {
      return;
    }
    run.mutate(undefined, { onSuccess: (response) => setLastRun(response) });
  };

  return (
    <div className="space-y-4">
      <Panel title="Overview">
        <DescriptionList
          items={[
            { label: "Name", value: data.name },
            { label: "Description", value: data.description ?? "\u2014" },
            { label: "Metrics", value: data.metrics.join(", ") || "\u2014" },
            { label: "Dataset size", value: formatNumber(datasetSize) },
            { label: "Created", value: formatDateTime(data.createdAt) },
            { label: "Id", value: data.id, mono: true },
          ]}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Add a dataset entry"
          description="A completed interaction to score: the input, the output, and an optional system prompt."
        >
          <div className="space-y-3">
            <Textarea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder="Input text..."
              rows={3}
              disabled={addDataset.isPending}
              aria-label="Entry input text"
            />
            <Textarea
              value={outputText}
              onChange={(event) => setOutputText(event.target.value)}
              placeholder="Output text to score..."
              rows={3}
              disabled={addDataset.isPending}
              aria-label="Entry output text"
            />
            <Input
              value={systemText}
              onChange={(event) => setSystemText(event.target.value)}
              placeholder="System prompt (optional)"
              disabled={addDataset.isPending}
              aria-label="Entry system text"
            />
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={onAdd}
                disabled={!canAdd}
                className="gap-2"
              >
                {addDataset.isPending ? (
                  <Spinner />
                ) : (
                  <Plus className="size-4" />
                )}
                {addDataset.isPending ? "Adding..." : "Add entry"}
              </Button>
            </div>
          </div>
        </Panel>

        <Panel
          title="Run"
          description="Score the experiment's metrics over its whole dataset."
        >
          <div className="space-y-3">
            <p className="text-[13px] text-text-muted">
              {datasetSize > 0
                ? `${formatNumber(datasetSize)} ${datasetSize === 1 ? "entry" : "entries"} in the dataset.`
                : "Add at least one dataset entry to run."}
            </p>
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
        <Panel
          title="Last run"
          description={`Scored ${formatNumber(lastRun.scoredCount)} of ${formatNumber(lastRun.datasetSize)} entries.`}
        >
          <ExperimentResultsTable metrics={lastRun.results} />
        </Panel>
      ) : null}

      <Panel
        title="Aggregated results"
        description="Average score per metric across the latest run."
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
              {comparison.data.experiments.map((entry) => (
                <div key={entry.experimentId} className="space-y-2">
                  <div className="text-[13px] font-medium text-text-muted">
                    {nameFor(entry.experimentId)}
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
