// Mirror of the backend Pydantic models (schemas/models.py). Kept local on
// purpose — no shared arc-contracts package yet (YAGNI).

export type RequestStatus = "ok" | "error";
export type Verdict = "pass" | "degrade" | "block" | "pending";

// Guardrails are domain-distinct from evals: allow / flag / block (+ modify),
// never relabelled into eval terms. They share the color grammar, not the words.
export type GuardrailDecision = "allow" | "flag" | "block" | "modify";

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

export interface JudgeResult {
  judge: string;
  model: string | null;
  score: number;
  passed: boolean;
  label: string | null;
  explanation: string | null;
  latency_ms: number;
  error: string | null;
}

export interface EvalRunSummary {
  evaluation_id: string;
  request_id: string;
  status: string;
  verdict: Verdict;
  aggregate_score: number | null;
  judges: string[];
  model: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface EvalRunComparison {
  evaluation_id: string;
  created_at: string;
  verdict: Verdict;
  aggregate_score: number | null;
  results: JudgeResult[];
}

export interface EvalRunDetail extends EvalRunSummary {
  mode: string;
  trace_id: string;
  input: string | null;
  output: string | null;
  results: JudgeResult[];
  rerun_of: string | null;
  compare_to: EvalRunComparison | null;
}

export interface Judge {
  name: string;
  description: string;
  requires: string[];
}

export interface ProviderInfo {
  name: string;
  configured: boolean;
  models: string[];
}

export interface InferRequest {
  prompt: string;
  model: string;
  provider?: string | null;
  system?: string | null;
}

export interface InferResult {
  request_id: string;
  trace_id: string;
  response: string;
  model: string;
  blocked: boolean;
  block_reason: string | null;
  scores: Record<string, number>;
}

export interface ModelProfile {
  name: string;
  provider: string;
  model: string;
  base_url: string | null;
}
