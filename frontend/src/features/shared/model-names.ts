"use client";

import { useMemo } from "react";

import { useModels } from "@/lib/api/queries";

/**
 * Resolve an inference's `modelId` (a model UUID) to its human name. Inference
 * and experiment rows carry the model's UUID, not its name, so surfaces that
 * show a name build one lookup from the cached catalog rather than fetching per
 * row. Falls back to a short id when the model is not in the catalog.
 */
export function useModelNames(): (modelUuid: string) => string {
  const { data } = useModels();
  return useMemo(() => {
    const names = new Map((data ?? []).map((model) => [model.id, model.name]));
    return (uuid: string) => names.get(uuid) ?? uuid.slice(0, 8);
  }, [data]);
}
