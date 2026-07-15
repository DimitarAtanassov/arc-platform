import type {
  AddDatasetResponse,
  DatasetEntry,
  EvalMetric,
  EvalRequestDetail,
  EvalRequestSummary,
  EvaluationEnvelope,
  EvaluationResult,
  Experiment,
  ExperimentComparison,
  ExperimentResults,
  ExperimentRunResponse,
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

export function toExperiment(record: JsonRecord): Experiment {
  return {
    id: String(record.id),
    name: String(record.name),
    description: asString(record.description),
    metrics: asStringArray(record.metrics),
    datasetSize: asNumber(record.dataset_size) ?? 0,
    createdAt: asString(record.created_at) ?? nowIso(),
  };
}

export function toDatasetEntry(record: JsonRecord): DatasetEntry {
  return {
    id: String(record.id),
    position: asNumber(record.position) ?? 0,
    inputText: String(record.input_text ?? ""),
    systemText: asString(record.system_text),
    outputText: String(record.output_text ?? ""),
    createdAt: asString(record.created_at) ?? nowIso(),
  };
}

export function toAddDatasetResponse(record: JsonRecord): AddDatasetResponse {
  return {
    experimentId: String(record.experiment_id),
    added: asNumber(record.added) ?? 0,
    datasetSize: asNumber(record.dataset_size) ?? 0,
  };
}

export function toExperimentRunResponse(
  record: JsonRecord,
): ExperimentRunResponse {
  return {
    runId: String(record.run_id),
    experimentId: String(record.experiment_id),
    status: asString(record.status) ?? "completed",
    datasetSize: asNumber(record.dataset_size) ?? 0,
    scoredCount: asNumber(record.scored_count) ?? 0,
    results: asRecordArray(record.results).map(toMetricAggregate),
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
