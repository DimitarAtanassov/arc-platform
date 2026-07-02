import "server-only";

/**
 * Server-only configuration for the BFF. `MODEL_LAB_URL` never carries the
 * `NEXT_PUBLIC_` prefix, so Next keeps it out of the browser bundle: the model
 * lab is reachable only from the Next server, exactly as the old standalone BFF
 * intended.
 */
export interface ModelLabConfig {
  baseUrl: string;
  timeoutMs: number;
  inferenceTimeoutMs: number;
}

function toInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getModelLabConfig(): ModelLabConfig {
  return {
    baseUrl: (process.env.MODEL_LAB_URL ?? "http://localhost:8000").replace(
      /\/$/,
      "",
    ),
    timeoutMs: toInt(process.env.MODEL_LAB_TIMEOUT_MS, 15_000),
    inferenceTimeoutMs: toInt(
      process.env.MODEL_LAB_INFERENCE_TIMEOUT_MS,
      120_000,
    ),
  };
}
