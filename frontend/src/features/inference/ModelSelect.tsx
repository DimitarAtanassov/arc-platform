"use client";

import { Select } from "@/components/ui";
import { useModels } from "@/lib/api/queries";

interface ModelSelectProps {
  id?: string;
  value: string;
  onChange: (modelName: string) => void;
  disabled?: boolean;
}

/**
 * A model chooser for running work. Only `active` models are offered, since
 * arc-model-lab rejects inference against an inactive model. The value is the
 * model's name (what the run endpoints expect), not its UUID.
 */
export function ModelSelect({ id, value, onChange, disabled }: ModelSelectProps) {
  const { data, isLoading } = useModels();
  const models = (data ?? []).filter((model) => model.status === "active");

  return (
    <Select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled || isLoading}
    >
      <option value="" disabled>
        {isLoading ? "Loading models..." : "Select a model"}
      </option>
      {models.map((model) => (
        <option key={model.id} value={model.name}>
          {model.name}
        </option>
      ))}
    </Select>
  );
}
