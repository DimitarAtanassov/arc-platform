import { describe, expect, it } from "vitest";

import {
  toEvalMetric,
  toEvalRequestDetail,
  toEvalRequestSummary,
  toEvaluationEnvelope,
  toExperiment,
  toExperimentRunResponse,
  toMetricScore,
} from "./mappers";

describe("eval-service mappers", () => {
  it("maps a metric definition", () => {
    expect(
      toEvalMetric({
        name: "faithfulness",
        version: "v1",
        rubric: "Is the output grounded?",
        requires: ["input", "output"],
        threshold: 0.5,
      }),
    ).toEqual({
      name: "faithfulness",
      version: "v1",
      rubric: "Is the output grounded?",
      requires: ["input", "output"],
      threshold: 0.5,
    });
  });

  it("maps an eval request summary, preserving null correlation ids", () => {
    const summary = toEvalRequestSummary({
      id: "r1",
      input_preview: "in",
      output_preview: "out",
      inference_id: null,
      model_id: null,
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(summary).toMatchObject({
      id: "r1",
      inputPreview: "in",
      outputPreview: "out",
      inferenceId: null,
      modelId: null,
    });
  });

  it("maps a metric score including its pass flag", () => {
    const score = toMetricScore({
      id: "s1",
      eval_request_id: "r1",
      inference_id: "inf1",
      model_id: "m1",
      metric_name: "safety",
      score: 0.95,
      passed: true,
      reasoning: "safe",
      evaluator_name: "judge",
      evaluator_version: "v1",
      latency_ms: 12.5,
      error: null,
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(score).toMatchObject({
      id: "s1",
      evalRequestId: "r1",
      metricName: "safety",
      score: 0.95,
      passed: true,
      evaluatorName: "judge",
      latencyMs: 12.5,
    });
  });

  it("maps a request detail with its nested results", () => {
    const detail = toEvalRequestDetail({
      id: "r1",
      input_text: "hello",
      output_text: "world",
      prompt: null,
      inference_id: "inf1",
      model_id: "m1",
      metadata: { source: "lab" },
      created_at: "2026-01-01T00:00:00Z",
      results: [
        {
          id: "s1",
          eval_request_id: "r1",
          inference_id: "inf1",
          model_id: "m1",
          metric_name: "safety",
          score: 1,
          passed: true,
          reasoning: null,
          evaluator_name: "judge",
          evaluator_version: null,
          latency_ms: 1,
          error: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });
    expect(detail.inputText).toBe("hello");
    expect(detail.metadata).toEqual({ source: "lab" });
    expect(detail.results).toHaveLength(1);
    expect(detail.results[0]?.metricName).toBe("safety");
  });

  it("maps an experiment, leaving modelId null when the service omits it", () => {
    const experiment = toExperiment({
      id: "e1",
      name: "baseline",
      description: null,
      model_name: "qwen",
      generation_config: { temperature: 0.7, max_output_tokens: 256 },
      prompt_template: null,
      variables: {},
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(experiment.modelName).toBe("qwen");
    expect(experiment.modelId).toBeNull();
    expect(experiment.generationConfig).toEqual({
      temperature: 0.7,
      maxOutputTokens: 256,
    });
  });

  it("maps an experiment run, taking its id from inference_id", () => {
    const run = toExperimentRunResponse({
      inference_id: "inf1",
      model_id: "mid",
      input_text: "x",
      prompt: "p",
      output_text: "y",
      latency_ms: 50,
      prompt_tokens: 1,
      completion_tokens: 2,
      experiment_id: "e1",
      created_at: "2026-01-01T00:00:00Z",
      evaluation: {
        contract_version: "1.0.0",
        results: [
          {
            metric_name: "safety",
            score: 1,
            reasoning: "safe",
            evaluator_name: "judge",
            evaluator_version: null,
          },
        ],
      },
    });
    expect(run.id).toBe("inf1");
    expect(run.experimentId).toBe("e1");
    // The service sends no status; a returned result set means completed.
    expect(run.evaluation?.status).toBe("completed");
    expect(run.evaluation?.results[0]?.metricName).toBe("safety");
  });

  it("defaults an evaluation with no status to completed", () => {
    expect(toEvaluationEnvelope({ results: [] }).status).toBe("completed");
  });
});
