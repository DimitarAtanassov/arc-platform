import "server-only";

import type {
  EvalMetric,
  EvalRequestDetail,
  EvalRequestSummary,
  EvaluationEnvelope,
  Experiment,
  ExperimentComparison,
  ExperimentResults,
  ExperimentRunResponse,
  MetricScore,
} from "@/lib/api/schemas";

import { getEvalServiceConfig, type EvalServiceConfig } from "../config";
import { BackendClient, type JsonRecord } from "../http";
import {
  toEvalMetric,
  toEvalRequestDetail,
  toEvalRequestSummary,
  toEvaluationEnvelope,
  toExperiment,
  toExperimentComparison,
  toExperimentResults,
  toExperimentRunResponse,
  toMetricScore,
} from "./mappers";

const SERVICE = "arc-eval-service";

export interface ListResultsQuery {
  limit: number;
  metric?: string | null;
  modelId?: string | null;
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
 * The BFF's client for arc-eval-service: the metric catalog, standalone
 * evaluation, the persisted evaluation records, and experiments. Reads degrade
 * to an empty list when the service is unreachable; single-resource reads and
 * writes fail loudly with a typed error the route handlers turn into a safe
 * response. Evaluate and experiment-run proxy inference through the lab, so they
 * use the longer inference timeout.
 */
export class EvalServiceClient extends BackendClient {
  private readonly inferenceTimeoutMs: number;

  constructor(config: EvalServiceConfig) {
    super(SERVICE, config);
    this.inferenceTimeoutMs = config.inferenceTimeoutMs;
  }

  async listMetrics(): Promise<EvalMetric[]> {
    return (await this.getList("/v1/metrics")).map(toEvalMetric);
  }

  async listRequests(limit: number): Promise<EvalRequestSummary[]> {
    return (await this.getList(`/v1/requests?limit=${limit}`)).map(
      toEvalRequestSummary,
    );
  }

  async getRequest(requestId: string): Promise<EvalRequestDetail> {
    const record = await this.getOne(
      `/v1/requests/${encodeURIComponent(requestId)}`,
      { resource: "eval request", identifier: requestId },
    );
    return toEvalRequestDetail(record);
  }

  async listResults(query: ListResultsQuery): Promise<MetricScore[]> {
    const params = new URLSearchParams({ limit: String(query.limit) });
    if (query.metric) {
      params.set("metric", query.metric);
    }
    if (query.modelId) {
      params.set("model_id", query.modelId);
    }
    return (await this.getList(`/v1/results?${params.toString()}`)).map(
      toMetricScore,
    );
  }

  /** Score a persisted inference by reference against the named metrics. */
  async evaluateInference(
    inferenceId: string,
    metrics: string[],
  ): Promise<EvaluationEnvelope> {
    const record = await this.sendJson(
      "POST",
      "/v1/evaluate",
      { inference_id: inferenceId, metrics },
      this.inferenceTimeoutMs,
      { resource: "inference", identifier: inferenceId },
    );
    return toEvaluationEnvelope(record);
  }

  async listExperiments(limit: number): Promise<Experiment[]> {
    return (await this.getList(`/v1/experiments?limit=${limit}`)).map(
      toExperiment,
    );
  }

  async getExperiment(experimentId: string): Promise<Experiment> {
    const record = await this.getOne(
      `/v1/experiments/${encodeURIComponent(experimentId)}`,
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
      "/v1/experiments",
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
      `/v1/experiments/${encodeURIComponent(experimentId)}/run`,
      body,
      this.inferenceTimeoutMs,
      { resource: "experiment", identifier: experimentId },
    );
    return toExperimentRunResponse(record);
  }

  async getExperimentResults(experimentId: string): Promise<ExperimentResults> {
    const record = await this.getOne(
      `/v1/experiments/${encodeURIComponent(experimentId)}/results`,
      { resource: "experiment", identifier: experimentId },
    );
    return toExperimentResults(record);
  }

  async compareExperiments(
    experimentId: string,
    otherId: string,
  ): Promise<ExperimentComparison> {
    const record = await this.getOne(
      `/v1/experiments/${encodeURIComponent(experimentId)}/compare/${encodeURIComponent(otherId)}`,
      { resource: "experiment", identifier: experimentId },
    );
    return toExperimentComparison(record);
  }
}

let singleton: EvalServiceClient | null = null;

/** The process-wide client, built from environment configuration on first use. */
export function getEvalServiceClient(): EvalServiceClient {
  singleton ??= new EvalServiceClient(getEvalServiceConfig());
  return singleton;
}
