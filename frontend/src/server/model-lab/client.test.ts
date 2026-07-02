import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  NotFoundError,
  UpstreamError,
  UpstreamUnavailableError,
} from "../errors";
import { ModelLabClient } from "./client";

const CONFIG = {
  baseUrl: "http://model-lab",
  timeoutMs: 1000,
  inferenceTimeoutMs: 1000,
};

function client() {
  return new ModelLabClient(CONFIG);
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ModelLabClient reads", () => {
  it("lists models normalized to camelCase", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, [
        { model_id: "gpt-4o", display_name: "GPT-4o", provider: "openai" },
      ]),
    );
    const models = await client().listModels();
    expect(models).toHaveLength(1);
    expect(models[0]?.displayName).toBe("GPT-4o");
  });

  it("degrades a list read to empty when the upstream errors", async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, {}));
    expect(await client().listModels()).toEqual([]);
  });

  it("degrades a list read to empty when the upstream is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("connection refused"));
    expect(await client().listInferences(50)).toEqual([]);
  });

  it("raises NotFound for a 404 single read", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, {}));
    await expect(client().getModel("ghost")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("raises Unavailable when a single read is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("down"));
    await expect(client().getModel("gpt-4o")).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
  });

  it("raises Upstream for other single-read failures", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { detail: "boom" }));
    await expect(client().getModel("gpt-4o")).rejects.toBeInstanceOf(
      UpstreamError,
    );
  });
});

describe("ModelLabClient runInference", () => {
  it("sends a snake_case payload and omits unset params", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(201, {
        inference_id: "inf-1",
        model_id: "gpt-4o",
        status: "succeeded",
        output_text: "Hello",
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }),
    );

    const detail = await client().runInference({
      modelId: "gpt-4o",
      prompt: "hi",
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      model_id: "gpt-4o",
      prompt: "hi",
      system_prompt: null,
      params: {},
    });
    expect(detail.output).toBe("Hello");
    expect(detail.usage?.totalTokens).toBe(30);
  });

  it("maps set params to snake_case", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(201, {
        inference_id: "i",
        model_id: "m",
        status: "succeeded",
        output_text: "o",
      }),
    );

    await client().runInference({
      modelId: "m",
      prompt: "hi",
      params: { temperature: 0.7, maxTokens: 512, topP: 1 },
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body)).params).toEqual({
      temperature: 0.7,
      max_tokens: 512,
      top_p: 1,
    });
  });

  it("surfaces the upstream error detail", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { detail: "temperature too high" }),
    );
    await expect(
      client().runInference({ modelId: "m", prompt: "hi" }),
    ).rejects.toThrow("temperature too high");
  });

  it("raises NotFound for an unknown model", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, {}));
    await expect(
      client().runInference({ modelId: "ghost", prompt: "hi" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
