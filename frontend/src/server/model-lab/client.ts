import "server-only";

import type {
  EvaluationEnvelope,
  Experiment,
  ExperimentComparison,
  ExperimentResults,
  ExperimentRunResponse,
  InferenceDetail,
  InferenceSummary,
  Model,
} from "@/lib/api/schemas";

import { getModelLabConfig, type ModelLabConfig } from "../config";
import { BackendClient, type JsonRecord } from "../http";
import {
  toEvaluationEnvelope,
  toExperiment,
  toExperimentComparison,
  toExperimentResults,
  toExperimentRunResponse,
  toInferenceDetail,
  toInferenceSummary,
  toModel,
} from "./mappers";

const SERVICE = "arc-model-lab";

export interface RunInferenceInput {
  modelName: string;
  inputText: string;
  temperature?: number | null;
}

export interface CreateExperimentInput {
  name: string;
  description?: string | null;
  modelName: string;
  generationConfig: { temperature: number; maxOutputTokens: number };
}

export interface RunExperimentInput {
  inputText: string;
  metrics?: string[];
}

/**
 * The BFF's client for arc-model-lab: the model catalog, inference, standalone
 * evaluation, and experiments. Reads degrade to an empty list when the service is
 * unreachable (see {@link BackendClient}); single-resource reads and writes fail
 * loudly with a typed error the route handlers turn into a safe response.
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

  async evaluateInference(
    inferenceId: string,
    metrics: string[],
  ): Promise<EvaluationEnvelope> {
    const record = await this.sendJson(
      "POST",
      `/inference/${encodeURIComponent(inferenceId)}/evaluate`,
      { metrics },
      this.inferenceTimeoutMs,
      { resource: "inference", identifier: inferenceId },
    );
    return toEvaluationEnvelope(record);
  }

  async listExperiments(limit: number): Promise<Experiment[]> {
    const records = await this.getList(`/experiments?limit=${limit}`);
    return records.map(toExperiment);
  }

  async getExperiment(experimentId: string): Promise<Experiment> {
    const record = await this.getOne(
      `/experiments/${encodeURIComponent(experimentId)}`,
      { resource: "experiment", identifier: experimentId },
    );
    return toExperiment(record);
  }

  async createExperiment(input: CreateExperimentInput): Promise<Experiment> {
    const body: JsonRecord = {
      name: input.name,
      description: input.description ?? null,
      model_name: input.modelName,
      generation_config: {
        temperature: input.generationConfig.temperature,
        max_output_tokens: input.generationConfig.maxOutputTokens,
      },
    };
    const record = await this.sendJson(
      "POST",
      "/experiments",
      body,
      this.config.timeoutMs,
      { resource: "model", identifier: input.modelName },
    );
    return toExperiment(record);
  }

  async runExperiment(
    experimentId: string,
    input: RunExperimentInput,
  ): Promise<ExperimentRunResponse> {
    const body: JsonRecord = { input_text: input.inputText };
    if (input.metrics && input.metrics.length > 0) {
      body.metrics = input.metrics;
    }
    const record = await this.sendJson(
      "POST",
      `/experiments/${encodeURIComponent(experimentId)}/run`,
      body,
      this.inferenceTimeoutMs,
      { resource: "experiment", identifier: experimentId },
    );
    return toExperimentRunResponse(record);
  }

  async getExperimentResults(experimentId: string): Promise<ExperimentResults> {
    const record = await this.getOne(
      `/experiments/${encodeURIComponent(experimentId)}/results`,
      { resource: "experiment", identifier: experimentId },
    );
    return toExperimentResults(record);
  }

  async compareExperiments(
    experimentId: string,
    otherId: string,
  ): Promise<ExperimentComparison> {
    const record = await this.getOne(
      `/experiments/${encodeURIComponent(experimentId)}/compare/${encodeURIComponent(otherId)}`,
      { resource: "experiment", identifier: experimentId },
    );
    return toExperimentComparison(record);
  }
}

let singleton: ModelLabClient | null = null;

/** The process-wide client, built from environment configuration on first use. */
export function getModelLabClient(): ModelLabClient {
  singleton ??= new ModelLabClient(getModelLabConfig());
  return singleton;
}
