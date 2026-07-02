import { z } from "zod";

import {
  inferenceDetailSchema,
  inferenceSummaryListSchema,
  modelDetailSchema,
  modelSummaryListSchema,
  type InferenceDetail,
  type InferenceRequestInput,
  type InferenceSummary,
  type ModelDetail,
  type ModelSummary,
} from "./schemas";

/**
 * The single HTTP entry point from the browser. It targets this app's own Route
 * Handlers (same origin, no CORS); the Next server is the BFF and is the only
 * thing that reaches arc-model-lab. Every response is validated by Zod, and
 * every failure becomes a typed ApiError carrying the `{detail, code}` envelope.
 */

const API_BASE = "/api";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const errorEnvelopeSchema = z.object({
  detail: z.string(),
  code: z.string(),
});

async function fetchJson<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  init?: RequestInit,
): Promise<z.output<S>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { accept: "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(
      "The console could not reach the BFF.",
      0,
      "network_error",
    );
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const envelope = errorEnvelopeSchema.safeParse(body);
    if (envelope.success) {
      throw new ApiError(
        envelope.data.detail,
        response.status,
        envelope.data.code,
      );
    }
    throw new ApiError(
      `Request failed with status ${response.status}.`,
      response.status,
      "http_error",
    );
  }

  return schema.parse(body);
}

export function getModels(): Promise<ModelSummary[]> {
  return fetchJson("/v1/models", modelSummaryListSchema);
}

export function getModel(modelId: string): Promise<ModelDetail> {
  return fetchJson(
    `/v1/models/${encodeURIComponent(modelId)}`,
    modelDetailSchema,
  );
}

export function getInferences(limit = 50): Promise<InferenceSummary[]> {
  return fetchJson(`/v1/inference?limit=${limit}`, inferenceSummaryListSchema);
}

export function getInference(inferenceId: string): Promise<InferenceDetail> {
  return fetchJson(
    `/v1/inference/${encodeURIComponent(inferenceId)}`,
    inferenceDetailSchema,
  );
}

/** Run one inference through the BFF (POST /v1/inference, 201 with the record). */
export function runInference(
  request: InferenceRequestInput,
): Promise<InferenceDetail> {
  return fetchJson("/v1/inference", inferenceDetailSchema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
}
