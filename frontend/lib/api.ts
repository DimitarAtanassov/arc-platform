// Thin client for the arc-platform BFF + a small data-fetching hook.

import { useCallback, useEffect, useState } from "react";

import type {
  EvalRunDetail,
  EvalRunSummary,
  EvaluationSummary,
  InferRequest,
  InferResult,
  Judge,
  ModelProfile,
  ProviderInfo,
  RequestDetail,
  RequestSummary,
  Trace,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${detail}`);
  }
  return (await response.json()) as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let detail = await response.text();
    try {
      const parsed = JSON.parse(detail) as { detail?: string };
      if (parsed.detail) detail = parsed.detail;
    } catch {
      // keep raw text
    }
    throw new Error(detail || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export const api = {
  listRequests: (limit = 50): Promise<RequestSummary[]> =>
    getJson(`/v1/requests?limit=${limit}`),
  getRequest: (requestId: string): Promise<RequestDetail> =>
    getJson(`/v1/requests/${encodeURIComponent(requestId)}`),
  getTrace: (traceId: string): Promise<Trace> =>
    getJson(`/v1/traces/${encodeURIComponent(traceId)}`),
  getEvaluationSummary: (): Promise<EvaluationSummary> =>
    getJson(`/v1/evaluations/summary`),
  listEvalRuns: (limit = 50): Promise<EvalRunSummary[]> =>
    getJson(`/v1/eval-runs?limit=${limit}`),
  getEvalRun: (id: string): Promise<EvalRunDetail> =>
    getJson(`/v1/eval-runs/${encodeURIComponent(id)}`),
  listJudges: (): Promise<Judge[]> => getJson(`/v1/judges`),
  listModels: (): Promise<ModelProfile[]> => getJson(`/v1/models`),
  listProviders: (): Promise<ProviderInfo[]> => getJson(`/v1/providers`),
  infer: (req: InferRequest): Promise<InferResult> => postJson(`/v1/infer`, req),
};

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/** Run an async loader and track loading/error state. */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [nonce, setNonce] = useState<number>(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    run()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [run, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload };
}
