import { describe, expect, it } from "vitest";

import { evaluateInteractionRequestSchema } from "./schemas";

/**
 * The standalone-eval request is the trust boundary shared by the browser client
 * and the BFF route (both parse through this schema), so its rules are pinned
 * here: every field is required and non-empty, and at least one metric is named.
 */
describe("evaluateInteractionRequestSchema", () => {
  it("accepts a complete interaction", () => {
    const result = evaluateInteractionRequestSchema.safeParse({
      inputText: "the sky is blue",
      outputText: "the sky is blue",
      metrics: ["faithfulness"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty input, output, or metric name", () => {
    const bodies = [
      { inputText: "", outputText: "a", metrics: ["m"] },
      { inputText: "a", outputText: "", metrics: ["m"] },
      { inputText: "a", outputText: "a", metrics: [""] },
    ];
    for (const body of bodies) {
      expect(evaluateInteractionRequestSchema.safeParse(body).success).toBe(
        false,
      );
    }
  });

  it("requires at least one metric", () => {
    const result = evaluateInteractionRequestSchema.safeParse({
      inputText: "a",
      outputText: "a",
      metrics: [],
    });
    expect(result.success).toBe(false);
  });
});
