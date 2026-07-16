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
/* arc-model-lab: generation parameters (registry + tuning knobs)              */
/* -------------------------------------------------------------------------- */

/**
 * The registry descriptors from `GET /generation/params` (spec 0001 §1.4). This
 * is metadata the UI renders controls from, mirrored here so the console has a
 * validated shape; the contract drift test asserts the bounds below match the
 * lab's registry, so a bound change the mirror has not tracked fails CI.
 */
export const generationParamKindSchema = z.enum([
  "int",
  "float",
  "bool",
  "str_list",
]);
export type GenerationParamKind = z.infer<typeof generationParamKindSchema>;

export const generationParamTierSchema = z.enum(["core", "advanced"]);
export type GenerationParamTier = z.infer<typeof generationParamTierSchema>;

export const generationParamGroupSchema = z.enum([
  "length",
  "sampling",
  "repetition",
  "beam",
  "determinism",
  "stopping",
]);
export type GenerationParamGroup = z.infer<typeof generationParamGroupSchema>;

export const generationParamSpecSchema = z.object({
  name: z.string(),
  kind: generationParamKindSchema,
  // Null for a knob whose ceiling is cross-field or runtime-sourced.
  minimum: z.number().nullish(),
  maximum: z.number().nullish(),
  default: z.union([z.number(), z.boolean(), z.array(z.string()), z.null()]),
  tier: generationParamTierSchema,
  group: generationParamGroupSchema,
});
export type GenerationParamSpec = z.infer<typeof generationParamSpecSchema>;

export const generationParamsSchema = z.object({
  // The effective runtime ceiling for max_output_tokens, sourced by the lab from
  // ARC_MAX_OUTPUT_TOKENS_CAP; the UI renders the operator's real bound.
  maxOutputTokensCap: z.number().int(),
  params: z.array(generationParamSpecSchema),
});
export type GenerationParams = z.infer<typeof generationParamsSchema>;

/**
 * The decoding-knob bundle: each field bounded to mirror the lab's parameter
 * registry (spec 0001 §1.2, §4.3). Every field is optional because a config
 * carries only the knobs a caller set; the lab defaults the rest. The
 * `maxOutputTokens` ceiling is deliberately not hardcoded here (only its static
 * floor is); the runtime cap is applied by {@link buildGenerationConfigSchema}
 * from the value in `GET /generation/params`. Cross-field mode conflicts (greedy
 * vs sampling vs beam) stay the lab's authority and are not enforced here.
 */
export const generationConfigSchema = z.object({
  maxOutputTokens: z.number().int().min(1).optional(),
  minNewTokens: z.number().int().min(0).optional(),
  doSample: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().min(0).max(1000).optional(),
  minP: z.number().min(0).max(1).optional(),
  repetitionPenalty: z.number().min(1).max(2).optional(),
  noRepeatNgramSize: z.number().int().min(0).max(10).optional(),
  numBeams: z.number().int().min(1).max(8).optional(),
  lengthPenalty: z.number().min(-2).max(2).optional(),
  earlyStopping: z.boolean().optional(),
  seed: z
    .number()
    .int()
    .min(0)
    .max(2 ** 32 - 1)
    .optional(),
  stop: z.array(z.string().min(1).max(32)).max(4).optional(),
});
export type GenerationConfig = z.infer<typeof generationConfigSchema>;

/**
 * {@link generationConfigSchema} with the `maxOutputTokens` ceiling set from the
 * effective server cap. The cap is read from `GET /generation/params` at runtime,
 * never hardcoded, so the mirror tracks the lab's `ARC_MAX_OUTPUT_TOKENS_CAP`.
 */
export function buildGenerationConfigSchema(
  maxOutputTokensCap: number,
): typeof generationConfigSchema {
  return generationConfigSchema.extend({
    maxOutputTokens: z.number().int().min(1).max(maxOutputTokensCap).optional(),
  });
}

/* -------------------------------------------------------------------------- */
/* arc-model-lab: presets                                                      */
/* -------------------------------------------------------------------------- */

export const presetStatusSchema = z.enum(["active", "archived"]);
export type PresetStatus = z.infer<typeof presetStatusSchema>;

export const presetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  config: generationConfigSchema,
  status: presetStatusSchema,
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});
export type Preset = z.infer<typeof presetSchema>;
export const presetListSchema = z.array(presetSchema);

/** Create body: a name, an optional note, and the decoding config to bundle. */
export const presetCreateRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2_000).nullish(),
  config: generationConfigSchema,
});
export type PresetCreateRequest = z.infer<typeof presetCreateRequestSchema>;

/** Patch body: change the note and/or replace the whole config bundle. */
export const presetUpdateRequestSchema = z.object({
  description: z.string().max(2_000).nullish(),
  config: generationConfigSchema.optional(),
});
export type PresetUpdateRequest = z.infer<typeof presetUpdateRequestSchema>;

/** The preset write bodies with the runtime `maxOutputTokens` cap applied. */
export function buildPresetCreateRequestSchema(
  maxOutputTokensCap: number,
): z.ZodType<PresetCreateRequest> {
  return presetCreateRequestSchema.extend({
    config: buildGenerationConfigSchema(maxOutputTokensCap),
  });
}

export function buildPresetUpdateRequestSchema(
  maxOutputTokensCap: number,
): z.ZodType<PresetUpdateRequest> {
  return presetUpdateRequestSchema.extend({
    config: buildGenerationConfigSchema(maxOutputTokensCap).optional(),
  });
}

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
  // The resolved config the row actually ran with, and the preset that informed
  // it, so the detail view can show exactly what ran (spec 0001 §3.4).
  generationConfig: generationConfigSchema.nullish(),
  presetId: z.string().nullish(),
});
export type InferenceDetail = z.infer<typeof inferenceDetailSchema>;

/**
 * The body the browser sends to run one inference (validated at the BFF). Per
 * spec 0001 §3.1 there is no top-level `temperature`; it is a `modelParams` key.
 * Decoding is informed two ways in precedence order: `modelParams` (an ad-hoc
 * override) wins over a stored `presetId`, and both win over the server defaults.
 */
export const inferenceRunRequestSchema = z.object({
  modelName: z.string().min(1).max(200),
  inputText: z.string().min(1).max(50_000),
  presetId: z.string().uuid().nullish(),
  modelParams: generationConfigSchema.partial().nullish(),
});
export type InferenceRunRequest = z.infer<typeof inferenceRunRequestSchema>;

/**
 * The same run request with `max_output_tokens` bounded by the effective server
 * cap, which is not hardcoded in the mirror but read from `GET /generation/params`
 * (spec 0001 §4.3). Used by the BFF at request time; the base schema above carries
 * only the static floor and drives the UI types.
 */
export function buildInferenceRunRequestSchema(
  maxOutputTokensCap: number,
): z.ZodType<InferenceRunRequest> {
  return inferenceRunRequestSchema.extend({
    modelParams: buildGenerationConfigSchema(maxOutputTokensCap)
      .partial()
      .nullish(),
  });
}

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
