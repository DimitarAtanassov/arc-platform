import { describe, expect, it } from "vitest";

import { toInferenceDetail, toInferenceSummary, toModel } from "./mappers";

describe("model-lab mappers", () => {
  it("maps a model record onto the camelCase contract", () => {
    const model = toModel({
      id: "11111111-1111-1111-1111-111111111111",
      name: "qwen2.5-1.5b-instruct",
      provider: "huggingface",
      model_id: "Qwen/Qwen2.5-1.5B-Instruct",
      tokenizer_id: "Qwen/Qwen2.5-1.5B-Instruct",
      revision: null,
      adapter_path: null,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    });

    expect(model).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      name: "qwen2.5-1.5b-instruct",
      provider: "huggingface",
      modelId: "Qwen/Qwen2.5-1.5B-Instruct",
      tokenizerId: "Qwen/Qwen2.5-1.5B-Instruct",
      revision: null,
      adapterPath: null,
      status: "active",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    });
  });

  it("coerces an unknown model status to inactive", () => {
    expect(
      toModel({
        id: "1",
        name: "m",
        model_id: "x",
        tokenizer_id: "t",
        status: "retired",
      }).status,
    ).toBe("inactive");
  });

  it("builds a compact inference summary from previews", () => {
    const summary = toInferenceSummary({
      id: "abc",
      model_id: "mid",
      input_preview: "in",
      output_preview: "out",
      latency_ms: 812,
      prompt_tokens: 10,
      completion_tokens: 20,
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(summary).toMatchObject({
      id: "abc",
      modelId: "mid",
      inputPreview: "in",
      outputPreview: "out",
      latencyMs: 812,
      promptTokens: 10,
      completionTokens: 20,
    });
  });

  it("maps an inference detail with nested evaluations", () => {
    const detail = toInferenceDetail({
      id: "abc",
      model_id: "mid",
      input_text: "hello",
      prompt: "PROMPT",
      output_text: "world",
      latency_ms: 100,
      prompt_tokens: 3,
      completion_tokens: 4,
      created_at: "2026-01-01T00:00:00Z",
      evaluations: [
        {
          metric_name: "faithfulness",
          score: 0.9,
          reasoning: "grounded",
          evaluator_name: "llm-judge",
          evaluator_version: "v1",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });
    expect(detail.inputText).toBe("hello");
    expect(detail.outputText).toBe("world");
    expect(detail.evaluations).toHaveLength(1);
    expect(detail.evaluations[0]).toMatchObject({
      metricName: "faithfulness",
      score: 0.9,
      evaluatorName: "llm-judge",
    });
  });
});
