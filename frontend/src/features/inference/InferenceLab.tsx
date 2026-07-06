"use client";

import { Play, Sparkles } from "lucide-react";
import { useId, useState } from "react";

import { Button, Input, Panel, Spinner, Textarea } from "@/components/ui";
import { useEvaluateInference, useRunInference } from "@/lib/api/queries";
import type { EvaluationEnvelope, InferenceDetail } from "@/lib/api/schemas";

import { MetricPicker } from "../shared/MetricPicker";
import { EvaluationResults } from "./EvaluationResults";
import { ModelSelect } from "./ModelSelect";
import { OutputPanel } from "./OutputPanel";

/**
 * The inference workbench: choose a model and prompt on the left, read the
 * output on the right, then score the result against metrics in place. State is
 * local and controlled so input survives a failed run. Both the run and the
 * evaluation are TanStack Query mutations; the browser calls only the BFF.
 */
export function InferenceLab() {
  const modelFieldId = useId();
  const promptFieldId = useId();
  const tempFieldId = useId();

  const [modelName, setModelName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [temperature, setTemperature] = useState("");
  const [current, setCurrent] = useState<InferenceDetail | null>(null);
  const [metrics, setMetrics] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationEnvelope | null>(null);

  const run = useRunInference();
  const evaluate = useEvaluateInference();

  const canRun = modelName !== "" && prompt.trim() !== "" && !run.isPending;
  const onRun = () => {
    if (!canRun) {
      return;
    }
    setEvaluation(null);
    const parsed = temperature.trim() === "" ? null : Number(temperature);
    const temp = parsed !== null && Number.isFinite(parsed) ? parsed : null;
    run.mutate(
      { modelName, inputText: prompt.trim(), temperature: temp },
      { onSuccess: (detail) => setCurrent(detail) },
    );
  };

  const canEvaluate =
    current !== null && metrics.length > 0 && !evaluate.isPending;
  const onEvaluate = () => {
    if (!canEvaluate || current === null) {
      return;
    }
    evaluate.mutate(
      { inferenceId: current.id, metrics },
      { onSuccess: (envelope) => setEvaluation(envelope) },
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="space-y-4">
        <Panel title="Model & prompt">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor={modelFieldId}
                className="block text-[13px] font-medium text-text-muted"
              >
                Model
              </label>
              <ModelSelect
                id={modelFieldId}
                value={modelName}
                onChange={setModelName}
                disabled={run.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={promptFieldId}
                className="block text-[13px] font-medium text-text-muted"
              >
                Input text
              </label>
              <Textarea
                id={promptFieldId}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Text to summarize..."
                disabled={run.isPending}
                rows={8}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={tempFieldId}
                className="block text-[13px] font-medium text-text-muted"
              >
                Temperature{" "}
                <span className="text-text-faint">(optional, 0&ndash;2)</span>
              </label>
              <Input
                id={tempFieldId}
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(event) => setTemperature(event.target.value)}
                placeholder="Server default"
                disabled={run.isPending}
                className="max-w-40"
              />
            </div>

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
                {run.isPending ? "Running..." : "Run inference"}
              </Button>
            </div>
          </div>
        </Panel>

        <Panel
          title="Evaluate"
          description="Score the run against arc-eval metrics."
        >
          {current === null ? (
            <p className="text-[13px] text-text-faint">
              Run an inference first, then choose metrics to score it.
            </p>
          ) : (
            <div className="space-y-3">
              <MetricPicker
                value={metrics}
                onChange={setMetrics}
                disabled={evaluate.isPending}
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={onEvaluate}
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
              {evaluation ? <EvaluationResults evaluation={evaluation} /> : null}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Output" description="The model's response and run metadata.">
        <OutputPanel
          isPending={run.isPending}
          error={run.error}
          result={current}
        />
      </Panel>
    </div>
  );
}
