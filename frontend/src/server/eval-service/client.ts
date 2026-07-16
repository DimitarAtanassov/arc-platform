import "server-only";

import type {
  AddDatasetResponse,
  DatasetEntry,
  DatasetEntryInput,
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
  toAddDatasetResponse,
  toDatasetEntry,
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
  metrics: string[];
  dataset?: DatasetEntryInput[];
}

/** The completed interaction to score, resolved by the route from a lab inference. */
export interface EvaluateInput {
  inputText: string;
  outputText: string;
  metrics: string[];
}

/**
 * The BFF's client for arc-eval-service: the metric catalog, standalone
 * evaluation, the persisted evaluation records, and experiments. Reads degrade
 * to an empty list when the service is unreachable; single-resource reads and
 * writes fail loudly with a typed error the route handlers turn into a safe
 * response. Evaluate and dataset runs invoke LLM judges, so they use the longer
 * inference timeout.
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

  /** Score a completed interaction (the input, the output, and the metrics). */
  async evaluate(input: EvaluateInput): Promise<EvaluationEnvelope> {
    const record = await this.sendJson(
      "POST",
      "/v1/evaluate",
      {
        input_text: input.inputText,
        output_text: input.outputText,
        metrics: input.metrics,
      },
      this.inferenceTimeoutMs,
      { resource: "evaluation", identifier: "interaction" },
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
      metrics: input.metrics,
    };
    if (input.dataset && input.dataset.length > 0) {
      body.dataset = input.dataset.map(toDatasetEntryBody);
    }
    const record = await this.sendJson(
      "POST",
      "/v1/experiments",
      body,
      this.config.timeoutMs,
      { resource: "experiment", identifier: input.name },
    );
    return toExperiment(record);
  }

  /** Score the experiment's metrics over its whole dataset. */
  async runExperiment(experimentId: string): Promise<ExperimentRunResponse> {
    const record = await this.sendJson(
      "POST",
      `/v1/experiments/${encodeURIComponent(experimentId)}/run`,
      {},
      this.inferenceTimeoutMs,
      { resource: "experiment", identifier: experimentId },
    );
    return toExperimentRunResponse(record);
  }

  async listDataset(experimentId: string): Promise<DatasetEntry[]> {
    return (
      await this.getList(
        `/v1/experiments/${encodeURIComponent(experimentId)}/dataset`,
      )
    ).map(toDatasetEntry);
  }

  async addDataset(
    experimentId: string,
    entries: DatasetEntryInput[],
  ): Promise<AddDatasetResponse> {
    const record = await this.sendJson(
      "POST",
      `/v1/experiments/${encodeURIComponent(experimentId)}/dataset`,
      { entries: entries.map(toDatasetEntryBody) },
      this.config.timeoutMs,
      { resource: "experiment", identifier: experimentId },
    );
    return toAddDatasetResponse(record);
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

/** Map a camelCase dataset entry onto arc-eval-service's snake_case body. */
function toDatasetEntryBody(entry: DatasetEntryInput): JsonRecord {
  return {
    input_text: entry.inputText,
    output_text: entry.outputText,
    system_text: entry.systemText ?? null,
  };
}

let singleton: EvalServiceClient | null = null;

/** The process-wide client, built from environment configuration on first use. */
export function getEvalServiceClient(): EvalServiceClient {
  singleton ??= new EvalServiceClient(getEvalServiceConfig());
  return singleton;
}
