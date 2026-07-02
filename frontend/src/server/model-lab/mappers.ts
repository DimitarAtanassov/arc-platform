import type {
  InferenceDetail,
  InferenceParams,
  InferenceStatus,
  InferenceSummary,
  ModelDetail,
  ModelStatus,
  ModelSummary,
  TokenUsage,
} from "@/lib/api/schemas";

/**
 * Pure mappers from arc-model-lab's snake_case records onto the BFF's camelCase
 * contract. Kept free of any server-only import so they stay trivially testable.
 * Access is defensive: the model lab is an external boundary.
 */

type Record_ = Record<string, unknown>;

const PROMPT_PREVIEW_CHARS = 140;
const MODEL_STATUSES: readonly ModelStatus[] = [
  "available",
  "preview",
  "deprecated",
  "retired",
];
const INFERENCE_STATUSES: readonly InferenceStatus[] = [
  "queued",
  "running",
  "succeeded",
  "failed",
];

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function asRecord(value: unknown): Record_ | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record_)
    : null;
}

function modelStatus(value: unknown): ModelStatus {
  return MODEL_STATUSES.includes(value as ModelStatus)
    ? (value as ModelStatus)
    : "available";
}

/** Collapse whitespace and truncate a prompt to a single-line table preview. */
function preview(text: string, limit = PROMPT_PREVIEW_CHARS): string {
  const collapsed = text.split(/\s+/).filter(Boolean).join(" ");
  if (collapsed.length <= limit) {
    return collapsed;
  }
  return `${collapsed.slice(0, limit - 1).replace(/\s+$/, "")}\u2026`;
}

export function toModelSummary(record: Record_): ModelSummary {
  const modelId = String(record.model_id);
  return {
    modelId,
    displayName: asString(record.display_name) ?? modelId,
    provider: asString(record.provider) ?? "unknown",
    family: asString(record.family),
    status: modelStatus(record.status),
    revision: asString(record.revision),
    tokenizerId: asString(record.tokenizer_id),
    adapterPath: asString(record.adapter_path),
    contextWindow: asNumber(record.context_window),
    maxOutputTokens: asNumber(record.max_output_tokens),
    modalities: asStringArray(record.modalities),
    createdAt: asString(record.created_at),
    updatedAt: asString(record.updated_at),
  };
}

export function toModelDetail(record: Record_): ModelDetail {
  return {
    ...toModelSummary(record),
    description: asString(record.description),
    runtimeSource: asString(record.runtime_source),
    capabilities: asStringArray(record.capabilities),
  };
}

/** Derive status from the record, falling back to error/output signals. */
function inferenceStatus(record: Record_): InferenceStatus {
  const raw = record.status;
  if (INFERENCE_STATUSES.includes(raw as InferenceStatus)) {
    return raw as InferenceStatus;
  }
  if (record.error) {
    return "failed";
  }
  if (record.output_text != null) {
    return "succeeded";
  }
  return "running";
}

function tokenUsage(record: Record_): TokenUsage | null {
  const usage = asRecord(record.usage);
  if (!usage) {
    return null;
  }
  return {
    promptTokens: asNumber(usage.prompt_tokens) ?? 0,
    completionTokens: asNumber(usage.completion_tokens) ?? 0,
    totalTokens: asNumber(usage.total_tokens) ?? 0,
  };
}

function inferenceParams(record: Record_): InferenceParams {
  const params = asRecord(record.params);
  if (!params) {
    return { temperature: null, maxTokens: null, topP: null };
  }
  return {
    temperature: asNumber(params.temperature),
    maxTokens: asNumber(params.max_tokens),
    topP: asNumber(params.top_p),
  };
}

export function toInferenceSummary(record: Record_): InferenceSummary {
  const usage = tokenUsage(record);
  return {
    inferenceId: String(record.inference_id),
    modelId: String(record.model_id),
    status: inferenceStatus(record),
    createdAt: asString(record.created_at) ?? new Date().toISOString(),
    latencyMs: asNumber(record.latency_ms),
    totalTokens: usage ? usage.totalTokens : null,
    promptPreview: preview(String(record.prompt ?? "")),
  };
}

export function toInferenceDetail(record: Record_): InferenceDetail {
  return {
    ...toInferenceSummary(record),
    prompt: String(record.prompt ?? ""),
    systemPrompt: asString(record.system_prompt),
    output: asString(record.output_text),
    finishReason: asString(record.finish_reason),
    params: inferenceParams(record),
    usage: tokenUsage(record),
    error: asString(record.error),
  };
}
