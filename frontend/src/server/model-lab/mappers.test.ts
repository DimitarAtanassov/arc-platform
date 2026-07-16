import { describe, expect, it } from "vitest";

import {
  generationConfigToWire,
  toGenerationConfig,
  toGenerationParams,
  toInferenceDetail,
  toInferenceSummary,
  toModel,
  toPreset,
} from "./mappers";

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

  it("maps an inference detail's resolved config and preset lineage", () => {
    const detail = toInferenceDetail({
      id: "abc",
      model_id: "mid",
      input_text: "hello",
      prompt: "PROMPT",
      output_text: "world",
      latency_ms: 100,
      created_at: "2026-01-01T00:00:00Z",
      generation_config: {
        max_output_tokens: 512,
        temperature: 0.9,
        top_p: 0.95,
      },
      preset_id: "33333333-3333-3333-3333-333333333333",
    });
    expect(detail.generationConfig).toEqual({
      maxOutputTokens: 512,
      temperature: 0.9,
      topP: 0.95,
    });
    expect(detail.presetId).toBe("33333333-3333-3333-3333-333333333333");
  });

  it("leaves config and preset null when the row carries neither", () => {
    const detail = toInferenceDetail({
      id: "abc",
      model_id: "mid",
      input_text: "hi",
      prompt: "p",
      output_text: "o",
      latency_ms: 5,
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(detail.generationConfig).toBeNull();
    expect(detail.presetId).toBeNull();
  });

  it("maps a preset, camelCasing only the config knobs that are set", () => {
    const preset = toPreset({
      id: "22222222-2222-2222-2222-222222222222",
      name: "creative",
      description: "warm sampling",
      config: {
        max_output_tokens: 256,
        temperature: 1.1,
        top_p: 0.9,
        do_sample: true,
      },
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    });
    expect(preset).toEqual({
      id: "22222222-2222-2222-2222-222222222222",
      name: "creative",
      description: "warm sampling",
      config: {
        maxOutputTokens: 256,
        temperature: 1.1,
        topP: 0.9,
        doSample: true,
      },
      status: "active",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    });
  });

  it("coerces an unknown preset status to active", () => {
    expect(
      toPreset({
        id: "1",
        name: "n",
        config: {},
        status: "deleted",
      }).status,
    ).toBe("active");
  });

  it("round-trips a config through wire and back", () => {
    const camel = {
      maxOutputTokens: 512,
      temperature: 0.8,
      topK: 40,
      stop: ["</s>"],
    };
    const wire = generationConfigToWire(camel);
    expect(wire).toEqual({
      max_output_tokens: 512,
      temperature: 0.8,
      top_k: 40,
      stop: ["</s>"],
    });
    expect(toGenerationConfig(wire)).toEqual(camel);
  });

  it("maps the generation params registry payload to camelCase", () => {
    const params = toGenerationParams({
      max_output_tokens_cap: 4096,
      params: [
        {
          name: "temperature",
          kind: "float",
          minimum: 0.0,
          maximum: 2.0,
          default: 0.0,
          tier: "core",
          group: "sampling",
        },
      ],
    });
    expect(params.maxOutputTokensCap).toBe(4096);
    expect(params.params[0]).toEqual({
      name: "temperature",
      kind: "float",
      minimum: 0.0,
      maximum: 2.0,
      default: 0.0,
      tier: "core",
      group: "sampling",
    });
  });
});
