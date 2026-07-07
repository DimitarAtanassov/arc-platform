import "server-only";

import { NextResponse } from "next/server";

import { getCorrelationId } from "./context";
import { log } from "./logging";

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
  const correlationId = getCorrelationId();
  return NextResponse.json(
    correlationId ? { detail, code, correlationId } : { detail, code },
    { status },
  );
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
  log.error("bff.unhandled_error", {
    correlation_id: getCorrelationId(),
    error:
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error),
  });
  return envelope(500, "internal server error", "internal_error");
}
