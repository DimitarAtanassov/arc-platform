"use client";

import { ArrowUpRight, FlaskConical } from "lucide-react";
import Link from "next/link";

import {
  Button,
  CopyButton,
  DescriptionList,
  EmptyState,
  ErrorState,
  LoadingState,
  type DescriptionItem,
} from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import type { InferenceDetail } from "@/lib/api/schemas";
import {
  EMPTY_VALUE,
  formatDateTime,
  formatLatency,
  formatNumber,
} from "@/lib/format";

import { InferenceStatusBadge } from "./InferenceStatusBadge";

interface OutputPanelProps {
  isPending: boolean;
  error: Error | null;
  result: InferenceDetail | null;
}

/**
 * The workbench output surface. It renders exactly one of: idle guidance, a
 * running spinner, a safe transport error, or the persisted inference record.
 * It never fabricates output; a record that failed downstream shows its error.
 */
export function OutputPanel({ isPending, error, result }: OutputPanelProps) {
  if (isPending) {
    return <LoadingState label="Running inference" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Inference failed"
        description={
          <>
            {error.message}
            <br />
            <span className="text-text-faint">
              Your input is preserved. Adjust it and run again.
            </span>
          </>
        }
        detail={error instanceof ApiError ? error.code : undefined}
      />
    );
  }

  if (!result) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="No output yet"
        description="Choose a model, enter a prompt, and run an inference to see the result here."
      />
    );
  }

  return <ResultView result={result} />;
}

function ResultView({ result }: { result: InferenceDetail }) {
  const hasOutput = result.status !== "failed" && Boolean(result.output);

  const metadata: DescriptionItem[] = [
    {
      label: "Inference ID",
      value: (
        <span className="flex items-center gap-2">
          <span className="font-mono text-[13px] text-text">
            {result.inferenceId}
          </span>
          <CopyButton
            value={result.inferenceId}
            label="Copy inference ID"
            iconOnly
            variant="ghost"
            size="icon"
            className="size-7"
          />
        </span>
      ),
    },
    { label: "Model", value: result.modelId, mono: true },
    { label: "Latency", value: formatLatency(result.latencyMs) },
    { label: "Prompt tokens", value: formatNumber(result.usage?.promptTokens) },
    {
      label: "Completion tokens",
      value: formatNumber(result.usage?.completionTokens),
    },
    {
      label: "Total tokens",
      value: formatNumber(result.usage?.totalTokens ?? result.totalTokens),
    },
    { label: "Finish reason", value: result.finishReason ?? EMPTY_VALUE },
    { label: "Created", value: formatDateTime(result.createdAt) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] text-text-muted">
          <InferenceStatusBadge status={result.status} />
          <span>
            Persisted as{" "}
            <span className="font-mono text-text">{result.inferenceId}</span>
          </span>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/inference/${encodeURIComponent(result.inferenceId)}`}>
            View detail
            <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-text-faint">
            Output
          </span>
          {hasOutput ? (
            <CopyButton
              value={result.output ?? ""}
              label="Copy output"
              variant="ghost"
              size="sm"
              className="h-6"
            />
          ) : null}
        </div>
        {hasOutput ? (
          <div className="max-h-[40vh] overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-surface-subtle p-4 text-sm leading-relaxed text-text">
            {result.output}
          </div>
        ) : (
          <div className="rounded-md border border-[var(--danger-border)] bg-danger-soft p-4 text-sm text-text">
            <span className="font-medium text-danger">Generation failed. </span>
            {result.error ?? "The model returned no output."}
          </div>
        )}
      </div>

      <div>
        <span className="mb-1.5 block text-[11px] uppercase tracking-wider text-text-faint">
          Run metadata
        </span>
        <DescriptionList items={metadata} />
      </div>
    </div>
  );
}
