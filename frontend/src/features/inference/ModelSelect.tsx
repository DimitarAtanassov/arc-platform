"use client";

import { Select } from "@/components/ui";
import { useModels } from "@/lib/api/queries";
import type { ModelSummary } from "@/lib/api/schemas";

interface ModelSelectProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  id?: string;
}

function groupByProvider(models: ModelSummary[]): Map<string, ModelSummary[]> {
  const groups = new Map<string, ModelSummary[]>();
  for (const model of models) {
    const list = groups.get(model.provider) ?? [];
    list.push(model);
    groups.set(model.provider, list);
  }
  return groups;
}

/**
 * The model chooser for the lab. Options come straight from GET /v1/models and
 * are grouped by provider. It never invents a model; when the catalog is empty
 * or unreachable the control stays empty and disabled.
 */
export function ModelSelect({
  value,
  onChange,
  disabled,
  id,
}: ModelSelectProps) {
  const { data, isPending, isError } = useModels();

  if (isError) {
    return (
      <p className="text-[13px] text-danger" role="alert">
        Could not load models from the BFF.
      </p>
    );
  }

  const models = data ?? [];
  const groups = groupByProvider(models);
  const noModels = !isPending && models.length === 0;

  return (
    <Select
      id={id}
      aria-label="Model"
      value={value}
      disabled={disabled || isPending || noModels}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="" disabled>
        {isPending
          ? "Loading models..."
          : noModels
            ? "No models available"
            : "Select a model"}
      </option>
      {[...groups.entries()].map(([provider, providerModels]) => (
        <optgroup key={provider} label={provider}>
          {providerModels.map((model) => (
            <option key={model.modelId} value={model.modelId}>
              {model.displayName} ({model.modelId})
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}
