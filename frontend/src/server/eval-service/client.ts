import "server-only";

import type {
  EvalMetric,
  EvalRequestDetail,
  EvalRequestSummary,
  MetricScore,
} from "@/lib/api/schemas";

import { getEvalServiceConfig, type BackendConfig } from "../config";
import { BackendClient } from "../http";
import {
  toEvalMetric,
  toEvalRequestDetail,
  toEvalRequestSummary,
  toMetricScore,
} from "./mappers";

const SERVICE = "arc-eval-service";

export interface ListResultsQuery {
  limit: number;
  metric?: string | null;
  modelId?: string | null;
}

/**
 * The BFF's client for arc-eval-service: the metric catalog and the persisted
 * evaluation records (requests and scores). Reads only; scoring is driven through
 * arc-model-lab, which owns the evaluate call.
 */
export class EvalServiceClient extends BackendClient {
  constructor(config: BackendConfig) {
    super(SERVICE, config);
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
}

let singleton: EvalServiceClient | null = null;

/** The process-wide client, built from environment configuration on first use. */
export function getEvalServiceClient(): EvalServiceClient {
  singleton ??= new EvalServiceClient(getEvalServiceConfig());
  return singleton;
}
