// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { log } from "./logging";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("structured logger", () => {
  it("emits one flat JSON line with level, event, and fields", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log.info("bff.request", { status: 200, correlation_id: "cid" });

    expect(spy).toHaveBeenCalledOnce();
    const line = JSON.parse(spy.mock.calls[0]?.[0] as string) as Record<
      string,
      unknown
    >;
    expect(line).toMatchObject({
      level: "info",
      event: "bff.request",
      status: 200,
      correlation_id: "cid",
    });
    expect(typeof line.ts).toBe("string");
  });

  it("writes errors to stderr", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    log.error("bff.unhandled_error", { error: "boom" });

    expect(spy).toHaveBeenCalledOnce();
    const line = JSON.parse(spy.mock.calls[0]?.[0] as string) as {
      level: string;
    };
    expect(line.level).toBe("error");
  });
});
