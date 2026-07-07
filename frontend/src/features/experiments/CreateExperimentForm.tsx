"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button, Input, Panel, Spinner, Textarea } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { useCreateExperiment } from "@/lib/api/queries";

import { ModelSelect } from "../inference/ModelSelect";

/** Create an experiment: a name, a model, and a decoding config. */
export function CreateExperimentForm() {
  const router = useRouter();
  const nameId = useId();
  const descId = useId();
  const modelId = useId();
  const tempId = useId();
  const tokensId = useId();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [modelName, setModelName] = useState("");
  const [temperature, setTemperature] = useState("0.0");
  const [maxTokens, setMaxTokens] = useState("256");

  const create = useCreateExperiment();
  const canSubmit = name.trim() !== "" && modelName !== "" && !create.isPending;

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() === "" ? null : description.trim(),
        modelName,
        generationConfig: {
          temperature: Number(temperature),
          maxOutputTokens: Number(maxTokens),
        },
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
            placeholder="e.g. qwen-greedy-baseline"
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
            placeholder="What is this experiment testing?"
            rows={2}
            disabled={create.isPending}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={modelId}
            className="block text-[13px] font-medium text-text-muted"
          >
            Model
          </label>
          <ModelSelect
            id={modelId}
            value={modelName}
            onChange={setModelName}
            disabled={create.isPending}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor={tempId}
              className="block text-[13px] font-medium text-text-muted"
            >
              Temperature
            </label>
            <Input
              id={tempId}
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(event) => setTemperature(event.target.value)}
              disabled={create.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor={tokensId}
              className="block text-[13px] font-medium text-text-muted"
            >
              Max output tokens
            </label>
            <Input
              id={tokensId}
              type="number"
              min={1}
              max={8192}
              step={1}
              value={maxTokens}
              onChange={(event) => setMaxTokens(event.target.value)}
              disabled={create.isPending}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          {create.isError ? (
            <span className="text-[12px] text-danger">
              {create.error instanceof ApiError
                ? create.error.message
                : "Could not create the experiment."}
            </span>
          ) : (
            <span />
          )}
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
