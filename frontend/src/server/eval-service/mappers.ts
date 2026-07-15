import type {
  EvalMetric,
  EvalRequestDetail,
  EvalRequestSummary,
  EvaluationEnvelope,
  EvaluationResult,
  Experiment,
  ExperimentComparison,
  ExperimentResults,
  ExperimentRunResponse,
  GenerationConfig,
  MetricAggregate,
  MetricScore,
} from "@/lib/api/schemas";

import {
  asBool,
  asNumber,
  asRecord,
  asRecordArray,
  asString,
  asStringArray,
  type JsonRecord,
} from "../mapping";

/**
 * Pure mappers from arc-eval-service's snake_case records onto the BFF's
 * camelCase contract. Free of any server-only import so they stay testable.
 */

const EVALUATION_STATUSES = ["completed", "failed", "skipped"] as const;

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * arc-eval-service does not emit a status on an evaluation — a returned result
 * set means the run completed — so completed is the default, and an explicit
 * status is honored only if a future version starts sending one.
 */
function evaluationStatus(value: unknown): EvaluationEnvelope["status"] {
  return EVALUATION_STATUSES.includes(value as EvaluationEnvelope["status"])
    ? (value as EvaluationEnvelope["status"])
    : "completed";
}

export function toEvalMetric(record: JsonRecord): EvalMetric {
  return {
    name: String(record.name),
    version: asString(record.version) ?? "v1",
    rubric: asString(record.rubric) ?? "",
    requires: asStringArray(record.requires),
    threshold: asNumber(record.threshold) ?? 0,
  };
}

export function toEvalRequestSummary(record: JsonRecord): EvalRequestSummary {
  return {
    id: String(record.id),
    inputPreview: asString(record.input_preview) ?? "",
    outputPreview: asString(record.output_preview) ?? "",
    inferenceId: asString(record.inference_id),
    modelId: asString(record.model_id),
    createdAt: asString(record.created_at) ?? nowIso(),
  };
}

export function toMetricScore(record: JsonRecord): MetricScore {
  return {
    id: String(record.id),
    evalRequestId: String(record.eval_request_id),
    inferenceId: asString(record.inference_id),
    modelId: asString(record.model_id),
    metricName: String(record.metric_name),
    score: asNumber(record.score) ?? 0,
    passed: asBool(record.passed),
    reasoning: asString(record.reasoning),
    evaluatorName: asString(record.evaluator_name) ?? "unknown",
    evaluatorVersion: asString(record.evaluator_version),
    latencyMs: asNumber(record.latency_ms) ?? 0,
    error: asString(record.error),
    createdAt: asString(record.created_at) ?? nowIso(),
  };
}

export function toEvalRequestDetail(record: JsonRecord): EvalRequestDetail {
  return {
    id: String(record.id),
    inputText: String(record.input_text ?? ""),
    outputText: String(record.output_text ?? ""),
    prompt: asString(record.prompt),
    inferenceId: asString(record.inference_id),
    modelId: asString(record.model_id),
    metadata: asRecord(record.metadata) ?? {},
    createdAt: asString(record.created_at) ?? nowIso(),
    results: asRecordArray(record.results).map(toMetricScore),
  };
}

/* ----------------------------- evaluation ------------------------------- */

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

/* ----------------------------- experiments ------------------------------ */

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
    modelId: asString(record.model_id),
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
    // The run response identifies the persisted inference by inference_id.
    id: String(record.inference_id ?? record.id),
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
