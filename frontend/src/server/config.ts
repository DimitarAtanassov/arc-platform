import "server-only";

/**
 * Server-only configuration for the BFF. Neither backend URL carries the
 * `NEXT_PUBLIC_` prefix, so Next keeps both out of the browser bundle: the
 * services are reachable only from the Next server. The browser calls this app's
 * own `/api` routes on the same origin, and the BFF fans out to the two backends.
 */
export interface BackendConfig {
  baseUrl: string;
  timeoutMs: number;
}

export interface ModelLabConfig extends BackendConfig {
  /** Inference loads models and generates, so it gets a longer timeout. */
  inferenceTimeoutMs: number;
}

export interface EvalServiceConfig extends BackendConfig {
  /** LLM judges score each entry, so evaluate and dataset runs get longer. */
  inferenceTimeoutMs: number;
}

function toInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/** arc-model-lab: the model catalog and inference. */
export function getModelLabConfig(): ModelLabConfig {
  return {
    baseUrl: stripTrailingSlash(
      process.env.MODEL_LAB_URL ?? "http://localhost:8000",
    ),
    timeoutMs: toInt(process.env.MODEL_LAB_TIMEOUT_MS, 15_000),
    inferenceTimeoutMs: toInt(
      process.env.MODEL_LAB_INFERENCE_TIMEOUT_MS,
      120_000,
    ),
  };
}

/** arc-eval-service: the metric catalog, evaluation, and experiments. */
export function getEvalServiceConfig(): EvalServiceConfig {
  return {
    baseUrl: stripTrailingSlash(
      process.env.EVAL_SERVICE_URL ?? "http://localhost:8001",
    ),
    timeoutMs: toInt(process.env.EVAL_SERVICE_TIMEOUT_MS, 15_000),
    inferenceTimeoutMs: toInt(
      process.env.EVAL_SERVICE_INFERENCE_TIMEOUT_MS,
      120_000,
    ),
  };
}
