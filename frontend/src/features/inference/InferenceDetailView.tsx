"use client";

import { ArrowLeft, Braces } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  Button,
  CodeBlock,
  CopyButton,
  DescriptionList,
  Drawer,
  ErrorState,
  LoadingState,
  Panel,
  type DescriptionItem,
} from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { useInference, useModels } from "@/lib/api/queries";
import {
  EMPTY_VALUE,
  formatDateTime,
  formatLatency,
  formatNumber,
} from "@/lib/format";

import { InferenceStatusBadge } from "./InferenceStatusBadge";
import { ReservedSections } from "./ReservedSections";

/** A titled, monospace, copyable text block for prompt-side content. */
function TextSection({
  title,
  text,
  copyLabel,
  ariaLabel,
  note,
}: {
  title: string;
  text: string;
  copyLabel: string;
  ariaLabel: string;
  note?: string;
}) {
  return (
    <Panel
      title={title}
      actions={
        text ? (
          <CopyButton
            value={text}
            label={copyLabel}
            variant="ghost"
            size="sm"
            className="h-7"
          />
        ) : undefined
      }
    >
      {note ? <p className="mb-2 text-[12px] text-text-faint">{note}</p> : null}
      <div
        aria-label={ariaLabel}
        className="max-h-[40vh] overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-surface-subtle p-4 font-mono text-[13px] leading-relaxed text-text"
      >
        {text || <span className="text-text-faint">(empty)</span>}
      </div>
    </Panel>
  );
}

export function InferenceDetailView({ inferenceId }: { inferenceId: string }) {
  const {
    data: run,
    isPending,
    isError,
    error,
    refetch,
  } = useInference(inferenceId);
  const { data: models } = useModels();
  const [rawOpen, setRawOpen] = useState(false);

  if (isPending) {
    return <LoadingState label="Loading inference" />;
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <ErrorState
        title={notFound ? "Inference not found" : "Could not load inference"}
        description={
          notFound
            ? `No inference in the history matches "${inferenceId}".`
            : error.message
        }
        detail={error instanceof ApiError ? error.code : undefined}
        onRetry={
          notFound
            ? undefined
            : () => {
                void refetch();
              }
        }
      />
    );
  }

  const modelName = models?.find(
    (model) => model.modelId === run.modelId,
  )?.displayName;
  const hasOutput = run.status !== "failed" && Boolean(run.output);
  const renderedPrompt = run.systemPrompt
    ? `System:\n${run.systemPrompt}\n\nUser:\n${run.prompt}`
    : run.prompt;

  const metadata: DescriptionItem[] = [
    {
      label: "Model",
      value: modelName ? (
        <span>
          {modelName}{" "}
          <span className="font-mono text-[13px] text-text-muted">
            ({run.modelId})
          </span>
        </span>
      ) : (
        <span className="font-mono text-[13px]">{run.modelId}</span>
      ),
    },
    { label: "Status", value: <InferenceStatusBadge status={run.status} /> },
    { label: "Latency", value: formatLatency(run.latencyMs) },
    { label: "Prompt tokens", value: formatNumber(run.usage?.promptTokens) },
    {
      label: "Completion tokens",
      value: formatNumber(run.usage?.completionTokens),
    },
    {
      label: "Total tokens",
      value: formatNumber(run.usage?.totalTokens ?? run.totalTokens),
    },
    { label: "Finish reason", value: run.finishReason ?? EMPTY_VALUE },
    { label: "Created", value: formatDateTime(run.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <Link
            href="/inference"
            className="inline-flex items-center gap-1 text-[13px] text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeft className="size-3.5" />
            History
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-lg font-semibold tracking-tight text-text">
              {run.inferenceId}
            </h1>
            <InferenceStatusBadge status={run.status} />
            <CopyButton
              value={run.inferenceId}
              label="Copy ID"
              variant="ghost"
              size="sm"
              className="h-7"
            />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRawOpen(true)}
          className="gap-1.5"
        >
          <Braces className="size-4" />
          Raw JSON
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <TextSection
            title="Input"
            text={run.prompt}
            copyLabel="Copy input"
            ariaLabel="Input text"
          />
          <TextSection
            title="Rendered prompt"
            text={renderedPrompt}
            copyLabel="Copy rendered prompt"
            ariaLabel="Rendered prompt"
            note={
              run.systemPrompt
                ? undefined
                : "No system prompt applied; the rendered prompt is the input."
            }
          />
          <Panel title="Output">
            {hasOutput ? (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <CopyButton
                    value={run.output ?? ""}
                    label="Copy output"
                    variant="ghost"
                    size="sm"
                    className="h-6"
                  />
                </div>
                <div
                  aria-label="Output text"
                  className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-surface-subtle p-4 text-sm leading-relaxed text-text"
                >
                  {run.output}
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-[var(--danger-border)] bg-danger-soft p-4 text-sm text-text">
                <span className="font-medium text-danger">
                  Generation failed.{" "}
                </span>
                {run.error ?? "The model returned no output."}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Metadata">
            <DescriptionList items={metadata} />
          </Panel>
          <Panel
            title="Reserved"
            description="Sections that attach once their backend capability exists."
          >
            <ReservedSections />
          </Panel>
        </div>
      </div>

      <Drawer
        open={rawOpen}
        onOpenChange={setRawOpen}
        title="Raw inference JSON"
        description={run.inferenceId}
      >
        <CodeBlock code={JSON.stringify(run, null, 2)} label="Inference JSON" />
      </Drawer>
    </div>
  );
}
