// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { runWithContext } from "./context";
import {
  NotFoundError,
  UpstreamError,
  UpstreamUnavailableError,
  toErrorResponse,
} from "./errors";

afterEach(() => {
  vi.restoreAllMocks();
});

async function bodyOf(response: Response): Promise<{
  detail: string;
  code: string;
  correlationId?: string;
}> {
  return (await response.json()) as {
    detail: string;
    code: string;
    correlationId?: string;
  };
}

describe("toErrorResponse", () => {
  it("maps NotFoundError to a 404 not_found envelope", async () => {
    const response = toErrorResponse(new NotFoundError("model", "m-1"));

    expect(response.status).toBe(404);
    const body = await bodyOf(response);
    expect(body.code).toBe("not_found");
    expect(body.detail).toContain("m-1");
  });

  it("maps UpstreamUnavailableError to a 503", async () => {
    const response = toErrorResponse(new UpstreamUnavailableError("down"));

    expect(response.status).toBe(503);
    expect((await bodyOf(response)).code).toBe("service_unavailable");
  });

  it("maps UpstreamError to a 502", async () => {
    const response = toErrorResponse(new UpstreamError("bad gateway"));

    expect(response.status).toBe(502);
    expect((await bodyOf(response)).code).toBe("upstream_error");
  });

  it("maps an unknown error to a 500 without leaking its detail", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = toErrorResponse(new Error("secret internals"));

    expect(response.status).toBe(500);
    const body = await bodyOf(response);
    expect(body.detail).toBe("internal server error");
    expect(body.code).toBe("internal_error");
    expect(body.detail).not.toContain("secret");
  });

  it("includes the active request's correlation id in the envelope", async () => {
    const response = runWithContext({ correlationId: "cid-err" }, () =>
      toErrorResponse(new NotFoundError("model", "m-2")),
    );

    expect((await bodyOf(response)).correlationId).toBe("cid-err");
  });
});
