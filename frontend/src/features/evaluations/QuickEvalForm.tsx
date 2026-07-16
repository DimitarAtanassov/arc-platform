"use client";

import { Sparkles } from "lucide-react";
import { useId, useState } from "react";

import { Button, Spinner, Textarea } from "@/components/ui";
import { useEvaluateInteraction } from "@/lib/api/queries";
import type { EvaluationEnvelope } from "@/lib/api/schemas";

import { EvaluationResults } from "../inference/EvaluationResults";
import { MetricPicker } from "../shared/MetricPicker";

/**
 * Score a pair of texts without a lab run: paste an input and an output, pick
 * metrics, and read the scores in place. The evaluator scores the supplied text
 * directly (arc-eval-service /v1/evaluate); nothing is written against a lab
 * inference. The metric picker and result surface are the same ones the lab and
 * history use, so a quick eval looks and reads identically.
 */
export function QuickEvalForm() {
  const inputFieldId = useId();
  const outputFieldId = useId();

  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [metrics, setMetrics] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationEnvelope | null>(null);

  const evaluate = useEvaluateInteraction();

  const canEvaluate =
    inputText.trim() !== "" &&
    outputText.trim() !== "" &&
    metrics.length > 0 &&
    !evaluate.isPending;

  const onEvaluate = () => {
    if (!canEvaluate) {
      return;
    }
    setEvaluation(null);
    evaluate.mutate(
      {
        inputText: inputText.trim(),
        outputText: outputText.trim(),
        metrics,
      },
      { onSuccess: (envelope) => setEvaluation(envelope) },
    );
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label
          htmlFor={inputFieldId}
          className="block text-[13px] font-medium text-text-muted"
        >
          Input
        </label>
        <Textarea
          id={inputFieldId}
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          placeholder="The prompt or source text..."
          disabled={evaluate.isPending}
          rows={5}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={outputFieldId}
          className="block text-[13px] font-medium text-text-muted"
        >
          Output
        </label>
        <Textarea
          id={outputFieldId}
          value={outputText}
          onChange={(event) => setOutputText(event.target.value)}
          placeholder="The response to score..."
          disabled={evaluate.isPending}
          rows={5}
        />
      </div>

      <div className="space-y-1.5">
        <span className="block text-[13px] font-medium text-text-muted">
          Metrics
        </span>
        <MetricPicker
          value={metrics}
          onChange={setMetrics}
          disabled={evaluate.isPending}
        />
      </div>

      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={onEvaluate}
          disabled={!canEvaluate}
          className="gap-2"
        >
          {evaluate.isPending ? (
            <Spinner className="text-on-accent" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {evaluate.isPending ? "Scoring..." : "Evaluate"}
        </Button>
      </div>

      {evaluate.isError ? (
        <p role="alert" className="text-[12px] text-danger">
          The evaluation could not be run. Check that arc-eval-service is
          reachable and try again.
        </p>
      ) : null}

      {evaluation ? <EvaluationResults evaluation={evaluation} /> : null}
    </div>
  );
}
