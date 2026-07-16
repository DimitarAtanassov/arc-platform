"use client";

import { Play, Sparkles } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Button, Panel, Spinner, Textarea } from "@/components/ui";
import {
  useEvaluateInference,
  useGenerationParams,
  useRunInference,
} from "@/lib/api/queries";
import {
  buildGenerationConfigSchema,
  type EvaluationEnvelope,
  type GenerationConfig,
  type InferenceDetail,
  type Preset,
} from "@/lib/api/schemas";

import { MetricPicker } from "../shared/MetricPicker";
import { EvaluationResults } from "./EvaluationResults";
import { ModelSelect } from "./ModelSelect";
import { OutputPanel } from "./OutputPanel";
import { PresetManager } from "./PresetManager";
import { TuningPanel } from "./TuningPanel";
import { configsEqual, normalizeConfig } from "./tuning";

/**
 * The inference workbench: choose a model and prompt, tune decoding from the
 * registry-driven panel, save or load presets, then run and read the resolved
 * config the row ran with. State is local and controlled so a failed run keeps
 * the model, prompt, and tuning. The run sends a loaded preset by id when it is
 * unmodified, otherwise the panel values as an ad-hoc `modelParams` override,
 * matching the lab's precedence (spec 0001 §3, §4.4). The browser calls only the
 * BFF; the lab stays the authority on decoding validity.
 */
export function InferenceLab() {
  const modelFieldId = useId();
  const promptFieldId = useId();

  const [modelName, setModelName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [config, setConfig] = useState<GenerationConfig>({});
  const [loadedPresetId, setLoadedPresetId] = useState<string | null>(null);
  const [loadedConfig, setLoadedConfig] = useState<GenerationConfig | null>(
    null,
  );
  const [current, setCurrent] = useState<InferenceDetail | null>(null);
  const [metrics, setMetrics] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationEnvelope | null>(null);

  const params = useGenerationParams();
  const run = useRunInference();
  const evaluate = useEvaluateInference();

  const configValid = useMemo(() => {
    if (params.data === undefined) {
      return true;
    }
    return buildGenerationConfigSchema(
      params.data.maxOutputTokensCap,
    ).safeParse(config).success;
  }, [params.data, config]);

  const canRun =
    modelName !== "" && prompt.trim() !== "" && configValid && !run.isPending;

  function onConfigChange(next: GenerationConfig) {
    setConfig(normalizeConfig(next));
  }

  function onLoadPreset(preset: Preset) {
    const loaded = normalizeConfig(preset.config);
    setConfig(loaded);
    setLoadedConfig(loaded);
    setLoadedPresetId(preset.id);
  }

  function onClearPreset() {
    setLoadedPresetId(null);
    setLoadedConfig(null);
  }

  function onUseSettings(fromRun: GenerationConfig) {
    setConfig(normalizeConfig(fromRun));
    setLoadedPresetId(null);
    setLoadedConfig(null);
  }

  const onRun = () => {
    if (!canRun) {
      return;
    }
    setEvaluation(null);
    // Precedence: a loaded, unmodified preset runs by id; any edit (or no preset)
    // runs the panel values as an ad-hoc override. The lab merges and re-validates.
    const presetUnmodified =
      loadedPresetId !== null &&
      loadedConfig !== null &&
      configsEqual(config, loadedConfig);
    const hasOverride = Object.keys(config).length > 0;

    run.mutate(
      {
        modelName,
        inputText: prompt.trim(),
        presetId: presetUnmodified ? loadedPresetId : undefined,
        modelParams: presetUnmodified || !hasOverride ? undefined : config,
      },
      { onSuccess: (detail) => setCurrent(detail) },
    );
  };

  const canEvaluate =
    current !== null && metrics.length > 0 && !evaluate.isPending;
  const onEvaluate = () => {
    if (!canEvaluate || current === null) {
      return;
    }
    evaluate.mutate(
      { inferenceId: current.id, metrics },
      { onSuccess: (envelope) => setEvaluation(envelope) },
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="space-y-4">
        <Panel title="Model & prompt">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor={modelFieldId}
                className="block text-[13px] font-medium text-text-muted"
              >
                Model
              </label>
              <ModelSelect
                id={modelFieldId}
                value={modelName}
                onChange={setModelName}
                disabled={run.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={promptFieldId}
                className="block text-[13px] font-medium text-text-muted"
              >
                Input text
              </label>
              <Textarea
                id={promptFieldId}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Text to summarize..."
                disabled={run.isPending}
                rows={8}
              />
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={onRun}
                disabled={!canRun}
                className="gap-2"
              >
                {run.isPending ? (
                  <Spinner className="text-on-accent" />
                ) : (
                  <Play className="size-4" />
                )}
                {run.isPending ? "Running..." : "Run inference"}
              </Button>
            </div>
          </div>
        </Panel>

        <Panel
          title="Decoding parameters"
          description="Tune generation; controls come from the model-lab registry."
        >
          {params.isLoading ? (
            <div className="flex items-center gap-2 py-4 text-[13px] text-text-faint">
              <Spinner /> Loading parameters...
            </div>
          ) : params.data === undefined ? (
            <p className="py-2 text-[13px] text-text-faint">
              Parameter registry unavailable; runs use the server defaults.
            </p>
          ) : (
            <TuningPanel
              params={params.data}
              config={config}
              onChange={onConfigChange}
              disabled={run.isPending}
            />
          )}
        </Panel>

        <Panel
          title="Presets"
          description="Save a tuning, or load one into the panel."
        >
          <PresetManager
            config={config}
            onLoad={onLoadPreset}
            loadedPresetId={loadedPresetId}
            onClear={onClearPreset}
            disabled={run.isPending}
          />
        </Panel>

        <Panel
          title="Evaluate"
          description="Score the run against arc-eval metrics."
        >
          {current === null ? (
            <p className="text-[13px] text-text-faint">
              Run an inference first, then choose metrics to score it.
            </p>
          ) : (
            <div className="space-y-3">
              <MetricPicker
                value={metrics}
                onChange={setMetrics}
                disabled={evaluate.isPending}
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={onEvaluate}
                  disabled={!canEvaluate}
                  className="gap-2"
                >
                  {evaluate.isPending ? (
                    <Spinner />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {evaluate.isPending ? "Scoring..." : "Evaluate"}
                </Button>
              </div>
              {evaluation ? (
                <EvaluationResults evaluation={evaluation} />
              ) : null}
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="Output"
        description="The model's response and run metadata."
      >
        <OutputPanel
          isPending={run.isPending}
          error={run.error}
          result={current}
          onUseSettings={onUseSettings}
        />
      </Panel>
    </div>
  );
}
