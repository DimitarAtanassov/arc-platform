import "server-only";

import type {
  InferenceDetail,
  InferenceSummary,
  Model,
} from "@/lib/api/schemas";

import { getModelLabConfig, type ModelLabConfig } from "../config";
import { BackendClient, type JsonRecord } from "../http";
import { toInferenceDetail, toInferenceSummary, toModel } from "./mappers";

const SERVICE = "arc-model-lab";

export interface RunInferenceInput {
  modelName: string;
  inputText: string;
  temperature?: number | null;
}

/**
 * The BFF's client for arc-model-lab: the model catalog and inference. Reads
 * degrade to an empty list when the service is unreachable (see
 * {@link BackendClient}); single-resource reads and writes fail loudly with a
 * typed error the route handlers turn into a safe response.
 */
export class ModelLabClient extends BackendClient {
  private readonly inferenceTimeoutMs: number;

  constructor(config: ModelLabConfig) {
    super(SERVICE, config);
    this.inferenceTimeoutMs = config.inferenceTimeoutMs;
  }

  async listModels(): Promise<Model[]> {
    return (await this.getList("/models")).map(toModel);
  }

  async getModel(name: string): Promise<Model> {
    const record = await this.getOne(`/models/${encodeURIComponent(name)}`, {
      resource: "model",
      identifier: name,
    });
    return toModel(record);
  }

  async listInferences(limit: number): Promise<InferenceSummary[]> {
    const records = await this.getList(`/inference?limit=${limit}`);
    return records.map(toInferenceSummary);
  }

  async getInference(inferenceId: string): Promise<InferenceDetail> {
    const record = await this.getOne(
      `/inference/${encodeURIComponent(inferenceId)}`,
      { resource: "inference", identifier: inferenceId },
    );
    return toInferenceDetail(record);
  }

  async runInference(input: RunInferenceInput): Promise<InferenceDetail> {
    const body: JsonRecord = {
      model_name: input.modelName,
      input_text: input.inputText,
    };
    if (input.temperature != null) {
      body.temperature = input.temperature;
    }
    const record = await this.sendJson(
      "POST",
      "/inference",
      body,
      this.inferenceTimeoutMs,
      { resource: "model", identifier: input.modelName },
    );
    return toInferenceDetail(record);
  }
}

let singleton: ModelLabClient | null = null;

/** The process-wide client, built from environment configuration on first use. */
export function getModelLabClient(): ModelLabClient {
  singleton ??= new ModelLabClient(getModelLabConfig());
  return singleton;
}
