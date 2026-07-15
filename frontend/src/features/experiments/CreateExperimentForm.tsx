"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button, Input, Panel, Spinner, Textarea } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { useCreateExperiment } from "@/lib/api/queries";

import { MetricPicker } from "../shared/MetricPicker";

/** Create an experiment: a name and the metrics it scores its dataset against. */
export function CreateExperimentForm() {
  const router = useRouter();
  const nameId = useId();
  const descId = useId();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metrics, setMetrics] = useState<string[]>([]);

  const create = useCreateExperiment();
  const canSubmit =
    name.trim() !== "" && metrics.length > 0 && !create.isPending;

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() === "" ? null : description.trim(),
        metrics,
      },
      {
        onSuccess: (experiment) => router.push(`/experiments/${experiment.id}`),
      },
    );
  };

  return (
    <Panel title="New experiment">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <label
            htmlFor={nameId}
            className="block text-[13px] font-medium text-text-muted"
          >
            Name
          </label>
          <Input
            id={nameId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. summarization-baseline"
            disabled={create.isPending}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={descId}
            className="block text-[13px] font-medium text-text-muted"
          >
            Description <span className="text-text-faint">(optional)</span>
          </label>
          <Textarea
            id={descId}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this experiment evaluating?"
            rows={2}
            disabled={create.isPending}
          />
        </div>

        <div className="space-y-1.5">
          <span className="block text-[13px] font-medium text-text-muted">
            Metrics
          </span>
          <MetricPicker
            value={metrics}
            onChange={setMetrics}
            disabled={create.isPending}
          />
          <p className="text-[12px] text-text-faint">
            The metric set this experiment scores its dataset against. Add
            dataset entries and run it from the experiment page.
          </p>
        </div>

        {create.isError ? (
          <p className="text-[13px] text-text-muted">
            {create.error instanceof ApiError
              ? create.error.message
              : "Failed to create the experiment."}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={!canSubmit}
            className="gap-2"
          >
            {create.isPending ? (
              <Spinner className="text-on-accent" />
            ) : (
              <Plus className="size-4" />
            )}
            {create.isPending ? "Creating..." : "Create experiment"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
