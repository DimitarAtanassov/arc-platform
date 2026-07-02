import { z } from "zod";

/**
 * Zod schemas for the BFF's camelCase wire contract. Responses are validated at
 * the boundary so the UI never renders unvalidated shapes, and the inferred
 * types are the single source of truth for the models feature.
 */

export const modelStatusSchema = z.enum([
  "available",
  "preview",
  "deprecated",
  "retired",
]);
export type ModelStatus = z.infer<typeof modelStatusSchema>;

// Timestamps arrive as ISO-8601 strings over JSON; formatting happens in the UI.
const isoTimestamp = z.string();

export const modelSummarySchema = z.object({
  modelId: z.string(),
  displayName: z.string(),
  provider: z.string(),
  family: z.string().nullish(),
  status: modelStatusSchema,
  revision: z.string().nullish(),
  tokenizerId: z.string().nullish(),
  adapterPath: z.string().nullish(),
  contextWindow: z.number().int().nullish(),
  maxOutputTokens: z.number().int().nullish(),
  modalities: z.array(z.string()).default([]),
  createdAt: isoTimestamp.nullish(),
  updatedAt: isoTimestamp.nullish(),
});
export type ModelSummary = z.infer<typeof modelSummarySchema>;

export const modelDetailSchema = modelSummarySchema.extend({
  description: z.string().nullish(),
  runtimeSource: z.string().nullish(),
  capabilities: z.array(z.string()).default([]),
});
export type ModelDetail = z.infer<typeof modelDetailSchema>;

export const modelSummaryListSchema = z.array(modelSummarySchema);

export const inferenceStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
]);
export type InferenceStatus = z.infer<typeof inferenceStatusSchema>;

export const inferenceParamsSchema = z.object({
  temperature: z.number().nullish(),
  maxTokens: z.number().int().nullish(),
  topP: z.number().nullish(),
});
export type InferenceParams = z.infer<typeof inferenceParamsSchema>;

export const tokenUsageSchema = z.object({
  promptTokens: z.number().int(),
  completionTokens: z.number().int(),
  totalTokens: z.number().int(),
});
export type TokenUsage = z.infer<typeof tokenUsageSchema>;

export const inferenceSummarySchema = z.object({
  inferenceId: z.string(),
  modelId: z.string(),
  status: inferenceStatusSchema,
  createdAt: isoTimestamp,
  latencyMs: z.number().nullish(),
  totalTokens: z.number().int().nullish(),
  promptPreview: z.string(),
});
export type InferenceSummary = z.infer<typeof inferenceSummarySchema>;

export const inferenceSummaryListSchema = z.array(inferenceSummarySchema);

export const inferenceDetailSchema = inferenceSummarySchema.extend({
  prompt: z.string(),
  systemPrompt: z.string().nullish(),
  output: z.string().nullish(),
  finishReason: z.string().nullish(),
  params: inferenceParamsSchema,
  usage: tokenUsageSchema.nullish(),
  error: z.string().nullish(),
});
export type InferenceDetail = z.infer<typeof inferenceDetailSchema>;

/** The body the browser sends to POST /v1/inference. */
export interface InferenceRequestInput {
  modelId: string;
  prompt: string;
  systemPrompt?: string | null;
  params?: {
    temperature?: number | null;
    maxTokens?: number | null;
    topP?: number | null;
  };
}
