import { describe, expect, it } from "vitest";

import {
  toInferenceDetail,
  toInferenceSummary,
  toModelDetail,
  toModelSummary,
} from "./mappers";

describe("toModelSummary", () => {
  it("maps snake_case onto the camelCase contract", () => {
    const model = toModelSummary({
      model_id: "gpt-4o",
      display_name: "GPT-4o",
      provider: "openai",
      context_window: 128000,
      modalities: ["text", "vision"],
      created_at: "2024-08-06T00:00:00Z",
    });
    expect(model.modelId).toBe("gpt-4o");
    expect(model.displayName).toBe("GPT-4o");
    expect(model.contextWindow).toBe(128000);
    expect(model.modalities).toEqual(["text", "vision"]);
    expect(model.createdAt).toBe("2024-08-06T00:00:00Z");
  });

  it("defaults display name, provider, status and modalities", () => {
    const model = toModelSummary({ model_id: "solo" });
    expect(model.displayName).toBe("solo");
    expect(model.provider).toBe("unknown");
    expect(model.status).toBe("available");
    expect(model.modalities).toEqual([]);
  });

  it("falls back to available on an unknown status", () => {
    expect(toModelSummary({ model_id: "x", status: "bogus" }).status).toBe(
      "available",
    );
  });
});

describe("toModelDetail", () => {
  it("adds the detail-only serving fields", () => {
    const detail = toModelDetail({
      model_id: "gpt-4o",
      runtime_source: "openai://chat/gpt-4o",
      capabilities: ["chat", "tools"],
    });
    expect(detail.runtimeSource).toBe("openai://chat/gpt-4o");
    expect(detail.capabilities).toEqual(["chat", "tools"]);
  });
});

describe("toInferenceSummary", () => {
  it("derives status from output when it is missing", () => {
    const summary = toInferenceSummary({
      inference_id: "i",
      model_id: "m",
      output_text: "hi",
    });
    expect(summary.status).toBe("succeeded");
  });

  it("collapses whitespace and truncates the prompt preview", () => {
    const summary = toInferenceSummary({
      inference_id: "i",
      model_id: "m",
      prompt: "a\n  b   c",
    });
    expect(summary.promptPreview).toBe("a b c");
  });

  it("reads total tokens from the usage block", () => {
    const summary = toInferenceSummary({
      inference_id: "i",
      model_id: "m",
      usage: { total_tokens: 30 },
    });
    expect(summary.totalTokens).toBe(30);
  });
});

describe("toInferenceDetail", () => {
  it("maps output_text to output and derives failed from an error", () => {
    const detail = toInferenceDetail({
      inference_id: "i",
      model_id: "m",
      error: "boom",
    });
    expect(detail.status).toBe("failed");
    expect(detail.error).toBe("boom");
    expect(detail.output).toBeNull();
  });

  it("maps usage and params", () => {
    const detail = toInferenceDetail({
      inference_id: "i",
      model_id: "m",
      status: "succeeded",
      output_text: "o",
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
      params: { temperature: 0.5, max_tokens: 8, top_p: 0.9 },
    });
    expect(detail.output).toBe("o");
    expect(detail.usage?.totalTokens).toBe(3);
    expect(detail.params.maxTokens).toBe(8);
  });
});
