import type {
  EvalMetric,
  EvalRequestDetail,
  EvalRequestSummary,
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

function nowIso(): string {
  return new Date().toISOString();
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
