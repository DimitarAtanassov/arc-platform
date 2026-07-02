import "server-only";

import type {
  InferenceDetail,
  InferenceRequestInput,
  InferenceSummary,
  ModelDetail,
  ModelSummary,
} from "@/lib/api/schemas";

import { getModelLabConfig, type ModelLabConfig } from "../config";
import {
  NotFoundError,
  UpstreamError,
  UpstreamUnavailableError,
} from "../errors";
import {
  toInferenceDetail,
  toInferenceSummary,
  toModelDetail,
  toModelSummary,
} from "./mappers";

const SERVICE = "arc-model-lab";
type Record_ = Record<string, unknown>;

function isRecord(value: unknown): value is Record_ {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Build the snake_case body arc-model-lab expects; unset params are omitted. */
function toRunPayload(request: InferenceRequestInput): Record_ {
  const params: Record<string, number> = {};
  if (request.params?.temperature != null) {
    params.temperature = request.params.temperature;
  }
  if (request.params?.maxTokens != null) {
    params.max_tokens = request.params.maxTokens;
  }
  if (request.params?.topP != null) {
    params.top_p = request.params.topP;
  }
  return {
    model_id: request.modelId,
    prompt: request.prompt,
    system_prompt: request.systemPrompt ?? null,
    params,
  };
}

/**
 * The BFF's only downstream. Reads degrade to an empty list when the model lab
 * is unreachable so a surface still renders; single-resource reads and writes
 * fail loudly with a typed error the route handlers turn into a safe response.
 */
export class ModelLabClient {
  constructor(private readonly config: ModelLabConfig) {}

  async listModels(): Promise<ModelSummary[]> {
    const records = await this.getList("/v1/models", this.config.timeoutMs);
    return records.map(toModelSummary);
  }

  async getModel(modelId: string): Promise<ModelDetail> {
    const record = await this.getOne(
      `/v1/models/${encodeURIComponent(modelId)}`,
      "model",
      modelId,
    );
    return toModelDetail(record);
  }

  async listInferences(limit: number): Promise<InferenceSummary[]> {
    const records = await this.getList(
      `/v1/inference?limit=${limit}`,
      this.config.timeoutMs,
    );
    return records.map(toInferenceSummary);
  }

  async getInference(inferenceId: string): Promise<InferenceDetail> {
    const record = await this.getOne(
      `/v1/inference/${encodeURIComponent(inferenceId)}`,
      "inference",
      inferenceId,
    );
    return toInferenceDetail(record);
  }

  async runInference(request: InferenceRequestInput): Promise<InferenceDetail> {
    const record = await this.post(
      "/v1/inference",
      toRunPayload(request),
      request.modelId,
    );
    return toInferenceDetail(record);
  }

  private async fetchUpstream(
    path: string,
    timeoutMs: number,
    init?: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${this.config.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        cache: "no-store",
        headers: { accept: "application/json", ...(init?.headers ?? {}) },
      });
    } catch {
      throw new UpstreamUnavailableError(`${SERVICE} is unreachable`);
    } finally {
      clearTimeout(timer);
    }
  }

  private async getList(path: string, timeoutMs: number): Promise<Record_[]> {
    try {
      const response = await this.fetchUpstream(path, timeoutMs);
      if (!response.ok) {
        return [];
      }
      const body: unknown = await response.json();
      return Array.isArray(body) ? body.filter(isRecord) : [];
    } catch {
      // Reads degrade to an empty list so the surface still renders.
      return [];
    }
  }

  private async getOne(
    path: string,
    resource: string,
    identifier: string,
  ): Promise<Record_> {
    const response = await this.fetchUpstream(path, this.config.timeoutMs);
    if (response.status === 404) {
      throw new NotFoundError(resource, identifier);
    }
    if (!response.ok) {
      throw new UpstreamError(await detail(response));
    }
    const body: unknown = await response.json().catch(() => null);
    if (!isRecord(body)) {
      throw new UpstreamError(`unexpected response shape from ${SERVICE}`);
    }
    return body;
  }

  private async post(
    path: string,
    payload: Record_,
    modelId: string,
  ): Promise<Record_> {
    const response = await this.fetchUpstream(
      path,
      this.config.inferenceTimeoutMs,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (response.status === 404) {
      throw new NotFoundError("model", modelId);
    }
    if (!response.ok) {
      throw new UpstreamError(await detail(response));
    }
    const body: unknown = await response.json().catch(() => null);
    if (!isRecord(body)) {
      throw new UpstreamError(`unexpected response shape from ${SERVICE}`);
    }
    return body;
  }
}

async function detail(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.detail === "string") {
      return body.detail;
    }
  } catch {
    // Fall through to the status-based message.
  }
  return `${SERVICE} returned ${response.status}`;
}

let singleton: ModelLabClient | null = null;

/** The process-wide client, built from environment configuration on first use. */
export function getModelLabClient(): ModelLabClient {
  singleton ??= new ModelLabClient(getModelLabConfig());
  return singleton;
}
