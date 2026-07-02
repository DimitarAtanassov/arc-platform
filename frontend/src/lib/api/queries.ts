import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getInference,
  getInferences,
  getModel,
  getModels,
  runInference,
} from "./client";
import type { InferenceRequestInput, InferenceSummary } from "./schemas";

/**
 * Query-key factories and hooks for server state. Keys are structured so the
 * models list and a single model's detail cache and invalidate independently.
 */

export const modelKeys = {
  all: ["models"] as const,
  list: () => [...modelKeys.all, "list"] as const,
  detail: (modelId: string) => [...modelKeys.all, "detail", modelId] as const,
};

export const inferenceKeys = {
  all: ["inferences"] as const,
  recent: (limit: number) => [...inferenceKeys.all, "recent", limit] as const,
  detail: (inferenceId: string) =>
    [...inferenceKeys.all, "detail", inferenceId] as const,
};

export function useModels() {
  return useQuery({
    queryKey: modelKeys.list(),
    queryFn: getModels,
  });
}

export function useModel(modelId: string) {
  return useQuery({
    queryKey: modelKeys.detail(modelId),
    queryFn: () => getModel(modelId),
    enabled: modelId.length > 0,
  });
}

/**
 * Recent inferences for one model. A per-model endpoint does not exist yet, so
 * this reads the recent history and narrows client-side by modelId. The `select`
 * keeps the filtered result cached under one shared list fetch.
 */
export function useModelInferences(modelId: string, limit = 50) {
  return useQuery({
    queryKey: inferenceKeys.recent(limit),
    queryFn: () => getInferences(limit),
    select: (all: InferenceSummary[]) =>
      all.filter((inference) => inference.modelId === modelId),
  });
}

/** The full recent inference history (most recent first, per the BFF). */
export function useInferenceHistory(limit = 200) {
  return useQuery({
    queryKey: inferenceKeys.recent(limit),
    queryFn: () => getInferences(limit),
  });
}

/** One persisted inference record (404 surfaces as an ApiError). */
export function useInference(inferenceId: string) {
  return useQuery({
    queryKey: inferenceKeys.detail(inferenceId),
    queryFn: () => getInference(inferenceId),
    enabled: inferenceId.length > 0,
  });
}

/**
 * Run one inference. On success the persisted record is returned to the caller,
 * and any mounted inference-history query is invalidated so it reflects the new
 * run. The lab keeps its own session log; this only refreshes server-backed
 * views.
 */
export function useRunInference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: InferenceRequestInput) => runInference(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inferenceKeys.all });
    },
  });
}
