import { z } from "zod";

/**
 * The BFF's camelCase wire contract, validated at the boundary so the UI never
 * renders an unvalidated shape. Every response the browser client receives is
 * parsed against one of these, and the inferred types are the single source of
 * truth for the features. Two backends sit behind the BFF: arc-model-lab (models
 * and inference) and arc-eval-service (metric catalog, evaluation, experiments,
 * and persisted evaluation records).
 */

// Timestamps arrive as ISO-8601 strings over JSON; formatting happens in the UI.
const isoTimestamp = z.string();

/* -------------------------------------------------------------------------- */
/* arc-model-lab: models                                                       */
/* -------------------------------------------------------------------------- */

export const modelStatusSchema = z.enum(["active", "inactive", "deprecated"]);
export type ModelStatus = z.infer<typeof modelStatusSchema>;

export const modelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  modelId: z.string(),
  tokenizerId: z.string(),
  revision: z.string().nullish(),
  adapterPath: z.string().nullish(),
  status: modelStatusSchema,
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});
export type Model = z.infer<typeof modelSchema>;
export const modelListSchema = z.array(modelSchema);

/* -------------------------------------------------------------------------- */
/* arc-model-lab: inference                                                    */
/* -------------------------------------------------------------------------- */

export const inferenceEvaluationSchema = z.object({
  metricName: z.string(),
  score: z.number(),
  reasoning: z.string().nullish(),
  evaluatorName: z.string(),
  evaluatorVersion: z.string().nullish(),
  createdAt: isoTimestamp,
});
export type InferenceEvaluation = z.infer<typeof inferenceEvaluationSchema>;

export const inferenceSummarySchema = z.object({
  id: z.string(),
  modelId: z.string(),
  inputPreview: z.string(),
  outputPreview: z.string(),
  latencyMs: z.number().int(),
  promptTokens: z.number().int().nullish(),
  completionTokens: z.number().int().nullish(),
  createdAt: isoTimestamp,
});
export type InferenceSummary = z.infer<typeof inferenceSummarySchema>;
export const inferenceSummaryListSchema = z.array(inferenceSummarySchema);

export const inferenceDetailSchema = z.object({
  id: z.string(),
  modelId: z.string(),
  inputText: z.string(),
  prompt: z.string(),
  outputText: z.string(),
  latencyMs: z.number().int(),
  promptTokens: z.number().int().nullish(),
  completionTokens: z.number().int().nullish(),
  createdAt: isoTimestamp,
  evaluations: z.array(inferenceEvaluationSchema).default([]),
});
export type InferenceDetail = z.infer<typeof inferenceDetailSchema>;

/** The body the browser sends to run one inference (validated at the BFF). */
export const inferenceRunRequestSchema = z.object({
  modelName: z.string().min(1).max(200),
  inputText: z.string().min(1).max(50_000),
  temperature: z.number().min(0).max(2).nullish(),
});
export type InferenceRunRequest = z.infer<typeof inferenceRunRequestSchema>;

/* -------------------------------------------------------------------------- */
/* arc-eval-service: evaluation (standalone + nested in an experiment run)     */
/* -------------------------------------------------------------------------- */

export const evaluationStatusSchema = z.enum([
  "completed",
  "failed",
  "skipped",
]);
export type EvaluationStatus = z.infer<typeof evaluationStatusSchema>;

export const evaluationResultSchema = z.object({
  metricName: z.string(),
  score: z.number(),
  evaluatorName: z.string(),
  evaluatorVersion: z.string().nullish(),
});
export type EvaluationResult = z.infer<typeof evaluationResultSchema>;

export const evaluationEnvelopeSchema = z.object({
  status: evaluationStatusSchema,
  results: z.array(evaluationResultSchema).default([]),
});
export type EvaluationEnvelope = z.infer<typeof evaluationEnvelopeSchema>;

/** The body the browser sends to score an inference or experiment run. */
export const evaluateRequestSchema = z.object({
  metrics: z.array(z.string().min(1)).min(1),
});
export type EvaluateRequest = z.infer<typeof evaluateRequestSchema>;

/* -------------------------------------------------------------------------- */
/* arc-eval-service: experiments                                               */
/* -------------------------------------------------------------------------- */

export const experimentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  metrics: z.array(z.string()).default([]),
  datasetSize: z.number().int().default(0),
  createdAt: isoTimestamp,
});
export type Experiment = z.infer<typeof experimentSchema>;
export const experimentListSchema = z.array(experimentSchema);

/** One completed interaction a caller adds to an experiment's dataset. */
export const datasetEntryInputSchema = z.object({
  inputText: z.string().min(1).max(50_000),
  outputText: z.string().min(1).max(50_000),
  systemText: z.string().min(1).max(50_000).nullish(),
});
export type DatasetEntryInput = z.infer<typeof datasetEntryInputSchema>;

export const datasetEntrySchema = z.object({
  id: z.string(),
  position: z.number().int(),
  inputText: z.string(),
  systemText: z.string().nullish(),
  outputText: z.string(),
  createdAt: isoTimestamp,
});
export type DatasetEntry = z.infer<typeof datasetEntrySchema>;
export const datasetEntryListSchema = z.array(datasetEntrySchema);

export const experimentCreateRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2_000).nullish(),
  metrics: z.array(z.string().min(1)).min(1),
  dataset: z.array(datasetEntryInputSchema).optional(),
});
export type ExperimentCreateRequest = z.infer<
  typeof experimentCreateRequestSchema
>;

export const addDatasetRequestSchema = z.object({
  entries: z.array(datasetEntryInputSchema).min(1),
});
export type AddDatasetRequest = z.infer<typeof addDatasetRequestSchema>;

export const addDatasetResponseSchema = z.object({
  experimentId: z.string(),
  added: z.number().int(),
  datasetSize: z.number().int(),
});
export type AddDatasetResponse = z.infer<typeof addDatasetResponseSchema>;

export const metricAggregateSchema = z.object({
  metricName: z.string(),
  averageScore: z.number(),
  evaluatedCount: z.number().int(),
});
export type MetricAggregate = z.infer<typeof metricAggregateSchema>;

/** The summary a run returns: its id, status, and per-metric aggregates. */
export const experimentRunResponseSchema = z.object({
  runId: z.string(),
  experimentId: z.string(),
  status: z.string(),
  datasetSize: z.number().int(),
  scoredCount: z.number().int(),
  results: z.array(metricAggregateSchema).default([]),
});
export type ExperimentRunResponse = z.infer<typeof experimentRunResponseSchema>;

export const experimentResultsSchema = z.object({
  experimentId: z.string(),
  metrics: z.array(metricAggregateSchema).default([]),
});
export type ExperimentResults = z.infer<typeof experimentResultsSchema>;

export const experimentComparisonSchema = z.object({
  experiments: z.array(experimentResultsSchema),
});
export type ExperimentComparison = z.infer<typeof experimentComparisonSchema>;

/* -------------------------------------------------------------------------- */
/* arc-eval-service: metric catalog + persisted evaluation records             */
/* -------------------------------------------------------------------------- */

export const evalMetricSchema = z.object({
  name: z.string(),
  version: z.string(),
  rubric: z.string(),
  requires: z.array(z.string()).default([]),
  threshold: z.number(),
});
export type EvalMetric = z.infer<typeof evalMetricSchema>;
export const evalMetricListSchema = z.array(evalMetricSchema);

export const evalRequestSummarySchema = z.object({
  id: z.string(),
  inputPreview: z.string(),
  outputPreview: z.string(),
  inferenceId: z.string().nullish(),
  modelId: z.string().nullish(),
  createdAt: isoTimestamp,
});
export type EvalRequestSummary = z.infer<typeof evalRequestSummarySchema>;
export const evalRequestListSchema = z.array(evalRequestSummarySchema);

export const metricScoreSchema = z.object({
  id: z.string(),
  evalRequestId: z.string(),
  inferenceId: z.string().nullish(),
  modelId: z.string().nullish(),
  metricName: z.string(),
  score: z.number(),
  passed: z.boolean(),
  reasoning: z.string().nullish(),
  evaluatorName: z.string(),
  evaluatorVersion: z.string().nullish(),
  latencyMs: z.number(),
  error: z.string().nullish(),
  createdAt: isoTimestamp,
});
export type MetricScore = z.infer<typeof metricScoreSchema>;
export const metricScoreListSchema = z.array(metricScoreSchema);

export const evalRequestDetailSchema = z.object({
  id: z.string(),
  inputText: z.string(),
  outputText: z.string(),
  prompt: z.string().nullish(),
  inferenceId: z.string().nullish(),
  modelId: z.string().nullish(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: isoTimestamp,
  results: z.array(metricScoreSchema).default([]),
});
export type EvalRequestDetail = z.infer<typeof evalRequestDetailSchema>;
