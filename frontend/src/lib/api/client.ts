import { z } from "zod";

import {
  evalMetricListSchema,
  evalRequestDetailSchema,
  evalRequestListSchema,
  evaluationEnvelopeSchema,
  addDatasetResponseSchema,
  datasetEntryListSchema,
  experimentListSchema,
  experimentResultsSchema,
  experimentRunResponseSchema,
  experimentComparisonSchema,
  experimentSchema,
  inferenceDetailSchema,
  inferenceSummaryListSchema,
  metricScoreListSchema,
  modelListSchema,
  modelSchema,
  type EvalMetric,
  type EvalRequestDetail,
  type EvalRequestSummary,
  type EvaluationEnvelope,
  type AddDatasetResponse,
  type DatasetEntry,
  type DatasetEntryInput,
  type Experiment,
  type ExperimentComparison,
  type ExperimentCreateRequest,
  type ExperimentResults,
  type ExperimentRunResponse,
  type InferenceDetail,
  type InferenceRunRequest,
  type InferenceSummary,
  type MetricScore,
  type Model,
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
  readonly correlationId?: string;

  constructor(
    message: string,
    status: number,
    code: string,
    correlationId?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
  }
}

const errorEnvelopeSchema = z.object({
  detail: z.string(),
  code: z.string(),
  correlationId: z.string().optional(),
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
    const correlationId = response.headers.get("x-correlation-id") ?? undefined;
    const envelope = errorEnvelopeSchema.safeParse(body);
    if (envelope.success) {
      throw new ApiError(
        envelope.data.detail,
        response.status,
        envelope.data.code,
        envelope.data.correlationId ?? correlationId,
      );
    }
    throw new ApiError(
      `Request failed with status ${response.status}.`,
      response.status,
      "http_error",
      correlationId,
    );
  }

  return schema.parse(body);
}

function postJson<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  payload: unknown,
): Promise<z.output<S>> {
  return fetchJson(path, schema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Liveness of the two backends, for the overview surface. */
export const healthSchema = z.object({
  modelLab: z.boolean(),
  evalService: z.boolean(),
});
export type HealthStatus = z.infer<typeof healthSchema>;

export function getHealth(): Promise<HealthStatus> {
  return fetchJson("/v1/health", healthSchema);
}

/* ------------------------------ models ---------------------------------- */

export function getModels(): Promise<Model[]> {
  return fetchJson("/v1/models", modelListSchema);
}

export function getModel(name: string): Promise<Model> {
  return fetchJson(`/v1/models/${encodeURIComponent(name)}`, modelSchema);
}

/* ---------------------------- inference --------------------------------- */

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
  request: InferenceRunRequest,
): Promise<InferenceDetail> {
  return postJson("/v1/inference", inferenceDetailSchema, request);
}

/** Score an existing inference against the named metrics. */
export function evaluateInference(
  inferenceId: string,
  metrics: string[],
): Promise<EvaluationEnvelope> {
  return postJson(
    `/v1/inference/${encodeURIComponent(inferenceId)}/evaluate`,
    evaluationEnvelopeSchema,
    { metrics },
  );
}

/* --------------------------- experiments -------------------------------- */

export function getExperiments(limit = 50): Promise<Experiment[]> {
  return fetchJson(`/v1/experiments?limit=${limit}`, experimentListSchema);
}

export function getExperiment(experimentId: string): Promise<Experiment> {
  return fetchJson(
    `/v1/experiments/${encodeURIComponent(experimentId)}`,
    experimentSchema,
  );
}

export function createExperiment(
  request: ExperimentCreateRequest,
): Promise<Experiment> {
  return postJson("/v1/experiments", experimentSchema, request);
}

export function runExperiment(
  experimentId: string,
): Promise<ExperimentRunResponse> {
  return postJson(
    `/v1/experiments/${encodeURIComponent(experimentId)}/run`,
    experimentRunResponseSchema,
    {},
  );
}

export function getExperimentDataset(
  experimentId: string,
): Promise<DatasetEntry[]> {
  return fetchJson(
    `/v1/experiments/${encodeURIComponent(experimentId)}/dataset`,
    datasetEntryListSchema,
  );
}

export function addDataset(
  experimentId: string,
  entries: DatasetEntryInput[],
): Promise<AddDatasetResponse> {
  return postJson(
    `/v1/experiments/${encodeURIComponent(experimentId)}/dataset`,
    addDatasetResponseSchema,
    { entries },
  );
}

export function getExperimentResults(
  experimentId: string,
): Promise<ExperimentResults> {
  return fetchJson(
    `/v1/experiments/${encodeURIComponent(experimentId)}/results`,
    experimentResultsSchema,
  );
}

export function compareExperiments(
  experimentId: string,
  otherId: string,
): Promise<ExperimentComparison> {
  return fetchJson(
    `/v1/experiments/${encodeURIComponent(experimentId)}/compare/${encodeURIComponent(otherId)}`,
    experimentComparisonSchema,
  );
}

/* ---------------------- eval-service (browse) --------------------------- */

export function getMetrics(): Promise<EvalMetric[]> {
  return fetchJson("/v1/eval/metrics", evalMetricListSchema);
}

export function getEvalRequests(limit = 50): Promise<EvalRequestSummary[]> {
  return fetchJson(`/v1/eval/requests?limit=${limit}`, evalRequestListSchema);
}

export function getEvalRequest(requestId: string): Promise<EvalRequestDetail> {
  return fetchJson(
    `/v1/eval/requests/${encodeURIComponent(requestId)}`,
    evalRequestDetailSchema,
  );
}

export interface EvalResultsQuery {
  limit?: number;
  metric?: string | null;
  modelId?: string | null;
}

export function getEvalResults(
  query: EvalResultsQuery = {},
): Promise<MetricScore[]> {
  const params = new URLSearchParams({ limit: String(query.limit ?? 50) });
  if (query.metric) {
    params.set("metric", query.metric);
  }
  if (query.modelId) {
    params.set("modelId", query.modelId);
  }
  return fetchJson(
    `/v1/eval/results?${params.toString()}`,
    metricScoreListSchema,
  );
}
