"use client";

import { Archive, Save } from "lucide-react";
import { useId, useState } from "react";

import { Button, Input, Select, Spinner } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { useArchivePreset, useCreatePreset, usePresets } from "@/lib/api/queries";
import type { GenerationConfig, Preset } from "@/lib/api/schemas";

interface PresetManagerProps {
  /** The current tuning to bundle when saving a new preset. */
  config: GenerationConfig;
  /** Load a preset's config into the tuning panel. */
  onLoad: (preset: Preset) => void;
  /** The id of the currently loaded preset, or null for an ad-hoc tuning. */
  loadedPresetId: string | null;
  /** Deselect the loaded preset (keeps the current panel values). */
  onClear: () => void;
  disabled?: boolean;
}

/**
 * Save the current tuning as a named preset, load a preset into the panel, and
 * archive one (spec 0001 §4.4). Backed by the preset TanStack Query mutations
 * against the BFF; the list degrades to empty when the lab is down.
 */
export function PresetManager({
  config,
  onLoad,
  loadedPresetId,
  onClear,
  disabled = false,
}: PresetManagerProps) {
  const nameId = useId();
  const descriptionId = useId();
  const loadId = useId();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: presets = [], isLoading } = usePresets();
  const create = useCreatePreset();
  const archive = useArchivePreset();

  const trimmedName = name.trim();
  const canSave = trimmedName !== "" && !create.isPending && !disabled;

  function onSave() {
    if (!canSave) {
      return;
    }
    create.mutate(
      {
        name: trimmedName,
        description: description.trim() === "" ? null : description.trim(),
        config,
      },
      {
        onSuccess: (preset) => {
          setName("");
          setDescription("");
          onLoad(preset);
        },
      },
    );
  }

  function onSelect(id: string) {
    if (id === "") {
      onClear();
      return;
    }
    const preset = presets.find((candidate) => candidate.id === id);
    if (preset) {
      onLoad(preset);
    }
  }

  const loaded = presets.find((preset) => preset.id === loadedPresetId) ?? null;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor={loadId}
          className="block text-[13px] font-medium text-text-muted"
        >
          Load preset
        </label>
        <div className="flex items-center gap-2">
          <Select
            id={loadId}
            value={loadedPresetId ?? ""}
            disabled={disabled || isLoading}
            onChange={(event) => onSelect(event.target.value)}
          >
            <option value="">
              {isLoading ? "Loading presets..." : "None (ad-hoc tuning)"}
            </option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </Select>
          {loaded !== null ? (
            <Button
              variant="outline"
              disabled={disabled || archive.isPending}
              onClick={() =>
                archive.mutate(loaded.id, { onSuccess: () => onClear() })
              }
              className="gap-1.5 whitespace-nowrap"
              aria-label={`Archive preset ${loaded.name}`}
            >
              {archive.isPending ? (
                <Spinner />
              ) : (
                <Archive className="size-4" />
              )}
              Archive
            </Button>
          ) : null}
        </div>
        {archive.error ? (
          <p role="alert" className="text-[12px] text-danger">
            {errorMessage(archive.error, "Could not archive the preset.")}
          </p>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <div className="space-y-1.5">
          <label
            htmlFor={nameId}
            className="block text-[13px] font-medium text-text-muted"
          >
            Save current tuning as preset
          </label>
          <Input
            id={nameId}
            type="text"
            value={name}
            maxLength={255}
            disabled={disabled}
            placeholder="Preset name"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <Input
          id={descriptionId}
          type="text"
          value={description}
          maxLength={2000}
          disabled={disabled}
          placeholder="Description (optional)"
          aria-label="Preset description"
          onChange={(event) => setDescription(event.target.value)}
        />
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={onSave}
            disabled={!canSave}
            className="gap-1.5"
          >
            {create.isPending ? <Spinner /> : <Save className="size-4" />}
            Save preset
          </Button>
        </div>
        {create.error ? (
          <p role="alert" className="text-[12px] text-danger">
            {errorMessage(create.error, "Could not save the preset.")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
