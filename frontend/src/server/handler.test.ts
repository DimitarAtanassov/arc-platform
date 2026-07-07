// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "./errors";
import { route } from "./handler";

beforeEach(() => {
  // Silence the boundary log lines; behavior is asserted on the response.
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function request(headers: Record<string, string> = {}): Request {
  return new Request("http://bff.test/api/v1/models", { headers });
}

describe("route boundary wrapper", () => {
  it("returns the handler response and stamps a correlation id header", async () => {
    const response = await route(request(), () =>
      Promise.resolve(Response.json({ ok: true })),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("honors a correlation id the caller already sent", async () => {
    const response = await route(
      request({ "x-correlation-id": "cid-in" }),
      () => Promise.resolve(Response.json({ ok: true })),
    );

    expect(response.headers.get("x-correlation-id")).toBe("cid-in");
  });

  it("maps a thrown domain error to a safe envelope carrying the same id", async () => {
    const response = await route(
      request({ "x-correlation-id": "cid-boom" }),
      () => {
        throw new NotFoundError("model", "m-404");
      },
    );

    expect(response.status).toBe(404);
    const body = (await response.json()) as {
      code: string;
      correlationId?: string;
    };
    expect(body.code).toBe("not_found");
    expect(body.correlationId).toBe("cid-boom");
    expect(response.headers.get("x-correlation-id")).toBe("cid-boom");
  });
});
