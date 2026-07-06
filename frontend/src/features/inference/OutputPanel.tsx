"use client";

import { CodeBlock, DescriptionList, ErrorState, LoadingState } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import type { InferenceDetail } from "@/lib/api/schemas";
import { formatLatency, formatNumber } from "@/lib/format";

interface OutputPanelProps {
  isPending: boolean;
  error: unknown;
  result: InferenceDetail | null;
}

/** The lab's result pane: the busy, error, empty, or output state of a run. */
export function OutputPanel({ isPending, error, result }: OutputPanelProps) {
  if (isPending) {
    return <LoadingState label="Running inference..." />;
  }
  if (error) {
    return (
      <ErrorState
        title="Run failed"
        description={
          error instanceof ApiError
            ? error.message
            : "The inference could not be completed."
        }
        detail={error instanceof ApiError ? error.code : undefined}
      />
    );
  }
  if (!result) {
    return (
      <p className="py-12 text-center text-sm text-text-faint">
        Select a model, enter a prompt, and run to see the output here.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <CodeBlock code={result.outputText} label="Model output" />
      <DescriptionList
        items={[
          { label: "Latency", value: formatLatency(result.latencyMs) },
          { label: "Prompt tokens", value: formatNumber(result.promptTokens) },
          {
            label: "Completion tokens",
            value: formatNumber(result.completionTokens),
          },
          { label: "Inference id", value: result.id, mono: true },
        ]}
      />
    </div>
  );
}
