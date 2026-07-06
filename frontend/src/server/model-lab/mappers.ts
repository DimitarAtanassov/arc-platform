import type {
  EvaluationEnvelope,
  EvaluationResult,
  Experiment,
  ExperimentComparison,
  ExperimentResults,
  ExperimentRunResponse,
  GenerationConfig,
  InferenceDetail,
  InferenceEvaluation,
  InferenceSummary,
  MetricAggregate,
  Model,
  ModelStatus,
} from "@/lib/api/schemas";

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
const EVALUATION_STATUSES = ["completed", "failed", "skipped"] as const;

function nowIso(): string {
  return new Date().toISOString();
}

function modelStatus(value: unknown): ModelStatus {
  return MODEL_STATUSES.includes(value as ModelStatus)
    ? (value as ModelStatus)
    : "inactive";
}

function evaluationStatus(value: unknown): EvaluationEnvelope["status"] {
  return EVALUATION_STATUSES.includes(value as EvaluationEnvelope["status"])
    ? (value as EvaluationEnvelope["status"])
    : "failed";
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

export function toEvaluationResult(record: JsonRecord): EvaluationResult {
  return {
    metricName: String(record.metric_name),
    score: asNumber(record.score) ?? 0,
    evaluatorName: asString(record.evaluator_name) ?? "unknown",
    evaluatorVersion: asString(record.evaluator_version),
  };
}

export function toEvaluationEnvelope(record: JsonRecord): EvaluationEnvelope {
  return {
    status: evaluationStatus(record.status),
    results: asRecordArray(record.results).map(toEvaluationResult),
  };
}

export function toGenerationConfig(value: unknown): GenerationConfig {
  const record = asRecord(value);
  return {
    temperature: asNumber(record?.temperature) ?? 0,
    maxOutputTokens: asNumber(record?.max_output_tokens) ?? 0,
  };
}

export function toExperiment(record: JsonRecord): Experiment {
  return {
    id: String(record.id),
    name: String(record.name),
    description: asString(record.description),
    modelId: String(record.model_id),
    modelName: asString(record.model_name) ?? "unknown",
    generationConfig: toGenerationConfig(record.generation_config),
    createdAt: asString(record.created_at) ?? nowIso(),
  };
}

export function toExperimentRunResponse(
  record: JsonRecord,
): ExperimentRunResponse {
  const evaluation = asRecord(record.evaluation);
  return {
    id: String(record.id),
    modelId: String(record.model_id),
    inputText: String(record.input_text ?? ""),
    prompt: String(record.prompt ?? ""),
    outputText: String(record.output_text ?? ""),
    latencyMs: asNumber(record.latency_ms) ?? 0,
    promptTokens: asNumber(record.prompt_tokens),
    completionTokens: asNumber(record.completion_tokens),
    experimentId: String(record.experiment_id),
    createdAt: asString(record.created_at) ?? nowIso(),
    evaluation: evaluation ? toEvaluationEnvelope(evaluation) : null,
  };
}

export function toMetricAggregate(record: JsonRecord): MetricAggregate {
  return {
    metricName: String(record.metric_name),
    averageScore: asNumber(record.average_score) ?? 0,
    evaluatedCount: asNumber(record.evaluated_count) ?? 0,
  };
}

export function toExperimentResults(record: JsonRecord): ExperimentResults {
  return {
    experimentId: String(record.experiment_id),
    metrics: asRecordArray(record.metrics).map(toMetricAggregate),
  };
}

export function toExperimentComparison(
  record: JsonRecord,
): ExperimentComparison {
  return {
    experiments: asRecordArray(record.experiments).map(toExperimentResults),
  };
}
