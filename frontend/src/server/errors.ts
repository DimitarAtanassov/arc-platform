import "server-only";

import { NextResponse } from "next/server";

/**
 * The BFF's error taxonomy. The client layer raises these; the route handlers
 * map them onto safe HTTP responses. Reads degrade to an empty list upstream, so
 * these only surface for single-resource reads and writes.
 */
export class NotFoundError extends Error {
  constructor(
    readonly resource: string,
    readonly identifier: string,
  ) {
    super(`${resource} '${identifier}' not found`);
    this.name = "NotFoundError";
  }
}

export class UpstreamError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "UpstreamError";
  }
}

export class UpstreamUnavailableError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "UpstreamUnavailableError";
  }
}

function envelope(status: number, detail: string, code: string): NextResponse {
  return NextResponse.json({ detail, code }, { status });
}

/** Map any thrown value onto the structured `{detail, code}` HTTP envelope. */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof NotFoundError) {
    return envelope(404, error.message, "not_found");
  }
  if (error instanceof UpstreamUnavailableError) {
    return envelope(503, error.message, "service_unavailable");
  }
  if (error instanceof UpstreamError) {
    return envelope(502, error.message, "upstream_error");
  }
  console.error("Unhandled BFF error", error);
  return envelope(500, "internal server error", "internal_error");
}
