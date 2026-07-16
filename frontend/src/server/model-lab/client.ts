import "server-only";

import type {
  GenerationConfig,
  GenerationParams,
  InferenceDetail,
  InferenceSummary,
  Model,
  Preset,
} from "@/lib/api/schemas";

import { getModelLabConfig, type ModelLabConfig } from "../config";
import { BackendClient, type JsonRecord } from "../http";
import {
  generationConfigToWire,
  toGenerationParams,
  toInferenceDetail,
  toInferenceSummary,
  toModel,
  toPreset,
} from "./mappers";

const SERVICE = "arc-model-lab";

export interface RunInferenceInput {
  modelName: string;
  inputText: string;
  presetId?: string | null;
  modelParams?: GenerationConfig | null;
}

export interface CreatePresetInput {
  name: string;
  description?: string | null;
  config: GenerationConfig;
}

export interface UpdatePresetInput {
  description?: string | null;
  config?: GenerationConfig;
}

/**
 * The BFF's client for arc-model-lab: the model catalog and inference. Reads
 * degrade to an empty list when the service is unreachable (see
 * {@link BackendClient}); single-resource reads and writes fail loudly with a
 * typed error the route handlers turn into a safe response.
 */
export class ModelLabClient extends BackendClient {
  private readonly inferenceTimeoutMs: number;
  private cachedParams: GenerationParams | null = null;

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
    if (input.presetId != null) {
      body.preset_id = input.presetId;
    }
    if (input.modelParams != null) {
      body.model_params = generationConfigToWire(input.modelParams);
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

  /**
   * The decoding parameter registry and effective cap the UI renders from.
   * Cached for the process after the first success (the registry is static per
   * deployment); a single-object read, so it fails loudly rather than degrading.
   */
  async getGenerationParams(): Promise<GenerationParams> {
    if (this.cachedParams === null) {
      const record = await this.getOne("/generation/params", {
        resource: "generation params",
        identifier: "registry",
      });
      this.cachedParams = toGenerationParams(record);
    }
    return this.cachedParams;
  }

  async listPresets(): Promise<Preset[]> {
    return (await this.getList("/presets")).map(toPreset);
  }

  async getPreset(presetId: string): Promise<Preset> {
    const record = await this.getOne(
      `/presets/${encodeURIComponent(presetId)}`,
      { resource: "preset", identifier: presetId },
    );
    return toPreset(record);
  }

  async createPreset(input: CreatePresetInput): Promise<Preset> {
    const record = await this.sendJson(
      "POST",
      "/presets",
      {
        name: input.name,
        description: input.description ?? null,
        config: generationConfigToWire(input.config),
      },
      this.config.timeoutMs,
      { resource: "preset", identifier: input.name },
    );
    return toPreset(record);
  }

  async updatePreset(
    presetId: string,
    input: UpdatePresetInput,
  ): Promise<Preset> {
    const body: JsonRecord = {};
    if ("description" in input) {
      body.description = input.description ?? null;
    }
    if (input.config !== undefined) {
      body.config = generationConfigToWire(input.config);
    }
    const record = await this.sendJson(
      "PATCH",
      `/presets/${encodeURIComponent(presetId)}`,
      body,
      this.config.timeoutMs,
      { resource: "preset", identifier: presetId },
    );
    return toPreset(record);
  }

  async archivePreset(presetId: string): Promise<void> {
    await this.sendDelete(
      `/presets/${encodeURIComponent(presetId)}`,
      this.config.timeoutMs,
      { resource: "preset", identifier: presetId },
    );
  }
}

let singleton: ModelLabClient | null = null;

/** The process-wide client, built from environment configuration on first use. */
export function getModelLabClient(): ModelLabClient {
  singleton ??= new ModelLabClient(getModelLabConfig());
  return singleton;
}
