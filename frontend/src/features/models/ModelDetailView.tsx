"use client";

import { ArrowLeft, Braces } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  Button,
  CodeBlock,
  DescriptionList,
  Drawer,
  ErrorState,
  LoadingState,
  Panel,
  type DescriptionItem,
} from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { useModel } from "@/lib/api/queries";
import { EMPTY_VALUE, formatDateTime, formatNumber } from "@/lib/format";

import { ModelStatusBadge } from "./ModelStatusBadge";
import { RecentInferences } from "./RecentInferences";

export function ModelDetailView({ modelId }: { modelId: string }) {
  const { data: model, isPending, isError, error, refetch } = useModel(modelId);
  const [rawOpen, setRawOpen] = useState(false);

  if (isPending) {
    return <LoadingState label="Loading model" />;
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <ErrorState
        title={notFound ? "Model not found" : "Could not load model"}
        description={
          notFound
            ? `No model in the catalog matches "${modelId}".`
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

  const metadata: DescriptionItem[] = [
    { label: "Model ID", value: model.modelId, mono: true },
    { label: "Provider", value: model.provider },
    { label: "Family", value: model.family ?? EMPTY_VALUE },
    { label: "Revision", value: model.revision ?? EMPTY_VALUE, mono: true },
    {
      label: "Runtime source",
      value: model.runtimeSource ?? EMPTY_VALUE,
      mono: true,
    },
    { label: "Tokenizer", value: model.tokenizerId ?? EMPTY_VALUE, mono: true },
    {
      label: "Adapter path",
      value: model.adapterPath ?? EMPTY_VALUE,
      mono: true,
    },
    { label: "Context window", value: formatNumber(model.contextWindow) },
    { label: "Max output tokens", value: formatNumber(model.maxOutputTokens) },
    {
      label: "Modalities",
      value: model.modalities.length
        ? model.modalities.join(", ")
        : EMPTY_VALUE,
    },
    {
      label: "Capabilities",
      value: model.capabilities.length
        ? model.capabilities.join(", ")
        : EMPTY_VALUE,
    },
    { label: "Created", value: formatDateTime(model.createdAt) },
    { label: "Updated", value: formatDateTime(model.updatedAt) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <Link
            href="/models"
            className="inline-flex items-center gap-1 text-[13px] text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeft className="size-3.5" />
            Models
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-text">
              {model.displayName}
            </h1>
            <ModelStatusBadge status={model.status} />
          </div>
          <p className="font-mono text-[13px] text-text-faint">
            {model.modelId}
          </p>
          {model.description ? (
            <p className="max-w-2xl pt-1 text-sm text-text-muted">
              {model.description}
            </p>
          ) : null}
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
        <Panel title="Metadata" className="lg:col-span-2">
          <DescriptionList items={metadata} />
        </Panel>
        <Panel
          title="Recent inferences"
          description="Runs recorded for this model."
        >
          <RecentInferences modelId={model.modelId} />
        </Panel>
      </div>

      <Drawer
        open={rawOpen}
        onOpenChange={setRawOpen}
        title="Raw model JSON"
        description={model.modelId}
      >
        <CodeBlock code={JSON.stringify(model, null, 2)} label="Model JSON" />
      </Drawer>
    </div>
  );
}
