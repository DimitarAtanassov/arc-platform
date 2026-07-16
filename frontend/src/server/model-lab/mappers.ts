import type {
  GenerationConfig,
  GenerationParams,
  GenerationParamSpec,
  InferenceDetail,
  InferenceEvaluation,
  InferenceSummary,
  Model,
  ModelStatus,
  Preset,
  PresetStatus,
} from "@/lib/api/schemas";
import { GENERATION_KNOB_FIELDS } from "@/lib/api/generation-knobs";

import {
  asNumber,
  asRecord,
  asRecordArray,
  asString,
  type JsonRecord,
} from "../mapping";

/**
 * Pure mappers from arc-model-lab's snake_case records onto the BFF's camelCase
 * contract. Kept free of any server-only import so they stay trivially testable.
 */

const MODEL_STATUSES: readonly ModelStatus[] = [
  "active",
  "inactive",
  "deprecated",
];

function nowIso(): string {
  return new Date().toISOString();
}

function modelStatus(value: unknown): ModelStatus {
  return MODEL_STATUSES.includes(value as ModelStatus)
    ? (value as ModelStatus)
    : "inactive";
}

export function toModel(record: JsonRecord): Model {
  return {
    id: String(record.id),
    name: String(record.name),
    provider: asString(record.provider) ?? "unknown",
    modelId: String(record.model_id),
    tokenizerId: String(record.tokenizer_id),
    revision: asString(record.revision),
    adapterPath: asString(record.adapter_path),
    status: modelStatus(record.status),
    createdAt: asString(record.created_at) ?? nowIso(),
    updatedAt: asString(record.updated_at) ?? nowIso(),
  };
}

export function toInferenceSummary(record: JsonRecord): InferenceSummary {
  return {
    id: String(record.id),
    modelId: String(record.model_id),
    inputPreview: asString(record.input_preview) ?? "",
    outputPreview: asString(record.output_preview) ?? "",
    latencyMs: asNumber(record.latency_ms) ?? 0,
    promptTokens: asNumber(record.prompt_tokens),
    completionTokens: asNumber(record.completion_tokens),
    createdAt: asString(record.created_at) ?? nowIso(),
  };
}

export function toInferenceEvaluation(record: JsonRecord): InferenceEvaluation {
  return {
    metricName: String(record.metric_name),
    score: asNumber(record.score) ?? 0,
    reasoning: asString(record.reasoning),
    evaluatorName: asString(record.evaluator_name) ?? "unknown",
    evaluatorVersion: asString(record.evaluator_version),
    createdAt: asString(record.created_at) ?? nowIso(),
  };
}

export function toInferenceDetail(record: JsonRecord): InferenceDetail {
  const generationConfig = asRecord(record.generation_config);
  return {
    id: String(record.id),
    modelId: String(record.model_id),
    inputText: String(record.input_text ?? ""),
    prompt: String(record.prompt ?? ""),
    outputText: String(record.output_text ?? ""),
    latencyMs: asNumber(record.latency_ms) ?? 0,
    promptTokens: asNumber(record.prompt_tokens),
    completionTokens: asNumber(record.completion_tokens),
    createdAt: asString(record.created_at) ?? nowIso(),
    evaluations: asRecordArray(record.evaluations).map(toInferenceEvaluation),
    generationConfig: generationConfig
      ? toGenerationConfig(generationConfig)
      : null,
    presetId: asString(record.preset_id),
  };
}

const PRESET_STATUSES: readonly PresetStatus[] = ["active", "archived"];

function presetStatus(value: unknown): PresetStatus {
  return PRESET_STATUSES.includes(value as PresetStatus)
    ? (value as PresetStatus)
    : "active";
}

/**
 * Map the lab's snake_case decoding config onto the camelCase knob bundle,
 * copying only the knobs actually present. The lab's `to_dict` omits unset knobs,
 * so the mapped bundle carries exactly the knobs the row (or preset) ran with.
 */
export function toGenerationConfig(record: JsonRecord): GenerationConfig {
  const config: Record<string, unknown> = {};
  for (const [camel, snake] of GENERATION_KNOB_FIELDS) {
    const value = record[snake];
    if (value !== undefined && value !== null) {
      config[camel] = value;
    }
  }
  return config as GenerationConfig;
}

/**
 * Map the camelCase knob bundle back onto the lab's snake_case body, emitting
 * only the knobs a caller set so the lab's precedence merge overlays exactly
 * those. The inverse of {@link toGenerationConfig}.
 */
export function generationConfigToWire(config: GenerationConfig): JsonRecord {
  const wire: JsonRecord = {};
  for (const [camel, snake] of GENERATION_KNOB_FIELDS) {
    const value = (config as Record<string, unknown>)[camel];
    if (value !== undefined) {
      wire[snake] = value;
    }
  }
  return wire;
}

export function toPreset(record: JsonRecord): Preset {
  return {
    id: String(record.id),
    name: String(record.name),
    description: asString(record.description),
    config: toGenerationConfig(asRecord(record.config) ?? {}),
    status: presetStatus(record.status),
    createdAt: asString(record.created_at) ?? nowIso(),
    updatedAt: asString(record.updated_at) ?? nowIso(),
  };
}

function toGenerationParamSpec(record: JsonRecord): GenerationParamSpec {
  return {
    name: String(record.name),
    kind: String(record.kind) as GenerationParamSpec["kind"],
    minimum: asNumber(record.minimum),
    maximum: asNumber(record.maximum),
    default: (record.default ?? null) as GenerationParamSpec["default"],
    tier: String(record.tier) as GenerationParamSpec["tier"],
    group: String(record.group) as GenerationParamSpec["group"],
  };
}

export function toGenerationParams(record: JsonRecord): GenerationParams {
  return {
    maxOutputTokensCap: asNumber(record.max_output_tokens_cap) ?? 0,
    params: asRecordArray(record.params).map(toGenerationParamSpec),
  };
}
