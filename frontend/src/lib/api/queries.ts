import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  compareExperiments,
  createExperiment,
  evaluateInference,
  getEvalRequest,
  getEvalRequests,
  getEvalResults,
  getExperiment,
  getExperimentResults,
  getExperiments,
  getHealth,
  getInference,
  getInferences,
  getMetrics,
  getModel,
  getModels,
  runExperiment,
  runInference,
  type EvalResultsQuery,
} from "./client";
import type {
  ExperimentCreateRequest,
  ExperimentRunRequest,
  InferenceRunRequest,
  InferenceSummary,
} from "./schemas";

/**
 * Query-key factories and hooks for server state. Keys are structured so each
 * surface's lists and details cache and invalidate independently, and mutations
 * invalidate exactly the views their write can change.
 */

export const healthKeys = {
  all: ["health"] as const,
};

export const modelKeys = {
  all: ["models"] as const,
  list: () => [...modelKeys.all, "list"] as const,
  detail: (name: string) => [...modelKeys.all, "detail", name] as const,
};

export const inferenceKeys = {
  all: ["inferences"] as const,
  recent: (limit: number) => [...inferenceKeys.all, "recent", limit] as const,
  detail: (inferenceId: string) =>
    [...inferenceKeys.all, "detail", inferenceId] as const,
};

export const experimentKeys = {
  all: ["experiments"] as const,
  list: (limit: number) => [...experimentKeys.all, "list", limit] as const,
  detail: (id: string) => [...experimentKeys.all, "detail", id] as const,
  results: (id: string) => [...experimentKeys.all, "results", id] as const,
  compare: (id: string, other: string) =>
    [...experimentKeys.all, "compare", id, other] as const,
};

export const evalKeys = {
  all: ["eval"] as const,
  metrics: () => [...evalKeys.all, "metrics"] as const,
  requests: (limit: number) => [...evalKeys.all, "requests", limit] as const,
  request: (id: string) => [...evalKeys.all, "request", id] as const,
  results: (query: EvalResultsQuery) =>
    [...evalKeys.all, "results", query] as const,
};

/* -------------------------------- health -------------------------------- */

export function useHealth() {
  return useQuery({
    queryKey: healthKeys.all,
    queryFn: getHealth,
    refetchInterval: 15_000,
  });
}

/* -------------------------------- models -------------------------------- */

export function useModels() {
  return useQuery({ queryKey: modelKeys.list(), queryFn: getModels });
}

export function useModel(name: string) {
  return useQuery({
    queryKey: modelKeys.detail(name),
    queryFn: () => getModel(name),
    enabled: name.length > 0,
  });
}

/* ------------------------------ inference -------------------------------- */

/** The full recent inference history (most recent first, per the BFF). */
export function useInferenceHistory(limit = 200) {
  return useQuery({
    queryKey: inferenceKeys.recent(limit),
    queryFn: () => getInferences(limit),
  });
}

/**
 * Recent inferences for one model. No per-model endpoint exists, so this reads
 * the recent history and narrows client-side by the model's id (inference rows
 * carry the model's UUID). The `select` keeps the filtered result cached under
 * one shared list fetch.
 */
export function useModelInferences(modelUuid: string, limit = 100) {
  return useQuery({
    queryKey: inferenceKeys.recent(limit),
    queryFn: () => getInferences(limit),
    select: (all: InferenceSummary[]) =>
      all.filter((inference) => inference.modelId === modelUuid),
  });
}

/** One persisted inference record with its evaluation scores (404 is an ApiError). */
export function useInference(inferenceId: string) {
  return useQuery({
    queryKey: inferenceKeys.detail(inferenceId),
    queryFn: () => getInference(inferenceId),
    enabled: inferenceId.length > 0,
  });
}

export function useRunInference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: InferenceRunRequest) => runInference(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inferenceKeys.all });
    },
  });
}

/** Score an existing inference; refresh its detail and the eval browse views. */
export function useEvaluateInference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      inferenceId,
      metrics,
    }: {
      inferenceId: string;
      metrics: string[];
    }) => evaluateInference(inferenceId, metrics),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: inferenceKeys.detail(variables.inferenceId),
      });
      void queryClient.invalidateQueries({ queryKey: evalKeys.all });
    },
  });
}

/* ------------------------------ experiments ------------------------------ */

export function useExperiments(limit = 100) {
  return useQuery({
    queryKey: experimentKeys.list(limit),
    queryFn: () => getExperiments(limit),
  });
}

export function useExperiment(experimentId: string) {
  return useQuery({
    queryKey: experimentKeys.detail(experimentId),
    queryFn: () => getExperiment(experimentId),
    enabled: experimentId.length > 0,
  });
}

export function useExperimentResults(experimentId: string) {
  return useQuery({
    queryKey: experimentKeys.results(experimentId),
    queryFn: () => getExperimentResults(experimentId),
    enabled: experimentId.length > 0,
  });
}

export function useCompareExperiments(
  experimentId: string,
  otherId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: experimentKeys.compare(experimentId, otherId),
    queryFn: () => compareExperiments(experimentId, otherId),
    enabled: enabled && experimentId.length > 0 && otherId.length > 0,
  });
}

export function useCreateExperiment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ExperimentCreateRequest) => createExperiment(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: experimentKeys.all });
    },
  });
}

export function useRunExperiment(experimentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ExperimentRunRequest) =>
      runExperiment(experimentId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: experimentKeys.results(experimentId),
      });
      void queryClient.invalidateQueries({ queryKey: inferenceKeys.all });
      void queryClient.invalidateQueries({ queryKey: evalKeys.all });
    },
  });
}

/* --------------------------- eval-service -------------------------------- */

export function useMetrics() {
  return useQuery({ queryKey: evalKeys.metrics(), queryFn: getMetrics });
}

export function useEvalRequests(limit = 100) {
  return useQuery({
    queryKey: evalKeys.requests(limit),
    queryFn: () => getEvalRequests(limit),
  });
}

export function useEvalRequest(requestId: string) {
  return useQuery({
    queryKey: evalKeys.request(requestId),
    queryFn: () => getEvalRequest(requestId),
    enabled: requestId.length > 0,
  });
}

export function useEvalResults(query: EvalResultsQuery = {}) {
  return useQuery({
    queryKey: evalKeys.results(query),
    queryFn: () => getEvalResults(query),
  });
}
