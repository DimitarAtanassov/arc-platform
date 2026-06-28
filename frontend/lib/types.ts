// Mirror of the backend Pydantic models (schemas/models.py). Kept local on
// purpose — no shared arc-contracts package yet (YAGNI).

export type RequestStatus = "ok" | "error";

export interface RequestSummary {
  request_id: string;
  trace_id: string;
  latency_ms: number;
  model_name: string;
  timestamp: string;
  status: RequestStatus;
}

export interface RequestDetail extends RequestSummary {
  prompt: string;
  response: string;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface Span {
  span_id: string;
  parent_span_id: string | null;
  name: string;
  start_offset_ms: number;
  duration_ms: number;
  attributes: Record<string, string>;
}

export interface Trace {
  trace_id: string;
  request_id: string;
  duration_ms: number;
  spans: Span[];
}

export interface MetricSummary {
  metric: string;
  total: number;
  passed: number;
  pass_rate: number;
  average_score: number;
}

export interface EvaluationSummary {
  total_evaluations: number;
  metrics: MetricSummary[];
}
