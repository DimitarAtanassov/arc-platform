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

  it("maps an experiment with its metrics and dataset size", () => {
    const experiment = toExperiment({
      id: "e1",
      name: "baseline",
      description: null,
      metrics: ["faithfulness", "answer_relevance"],
      dataset_size: 3,
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(experiment.name).toBe("baseline");
    expect(experiment.metrics).toEqual(["faithfulness", "answer_relevance"]);
    expect(experiment.datasetSize).toBe(3);
  });

  it("maps an experiment run's per-metric aggregates", () => {
    const run = toExperimentRunResponse({
      run_id: "r1",
      experiment_id: "e1",
      status: "completed",
      dataset_size: 3,
      scored_count: 3,
      results: [
        { metric_name: "faithfulness", average_score: 0.88, evaluated_count: 3 },
      ],
    });
    expect(run.runId).toBe("r1");
    expect(run.experimentId).toBe("e1");
    expect(run.status).toBe("completed");
    expect(run.datasetSize).toBe(3);
    expect(run.scoredCount).toBe(3);
    expect(run.results[0]?.metricName).toBe("faithfulness");
    expect(run.results[0]?.averageScore).toBe(0.88);
  });

  it("defaults an evaluation with no status to completed", () => {
    expect(toEvaluationEnvelope({ results: [] }).status).toBe("completed");
  });
});
