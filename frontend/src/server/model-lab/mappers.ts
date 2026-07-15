import type {
  InferenceDetail,
  InferenceEvaluation,
  InferenceSummary,
  Model,
  ModelStatus,
} from "@/lib/api/schemas";

import { asNumber, asRecordArray, asString, type JsonRecord } from "../mapping";

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
  };
}
