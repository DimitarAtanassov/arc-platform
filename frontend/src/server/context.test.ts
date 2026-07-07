// @vitest-environment node
import { describe, expect, it } from "vitest";

import { getCorrelationId, runWithContext } from "./context";

describe("request context", () => {
  it("has no correlation id outside a request", () => {
    expect(getCorrelationId()).toBeUndefined();
  });

  it("exposes the correlation id inside runWithContext", () => {
    const seen = runWithContext({ correlationId: "cid-1" }, () =>
      getCorrelationId(),
    );
    expect(seen).toBe("cid-1");
  });

  it("keeps the correlation id across an await boundary", async () => {
    const seen = await runWithContext({ correlationId: "cid-2" }, async () => {
      await Promise.resolve();
      return getCorrelationId();
    });
    expect(seen).toBe("cid-2");
  });

  it("does not leak the id after the context ends", async () => {
    await runWithContext({ correlationId: "cid-3" }, async () => {
      await Promise.resolve();
    });
    expect(getCorrelationId()).toBeUndefined();
  });
});
