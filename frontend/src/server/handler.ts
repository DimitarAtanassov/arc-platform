import "server-only";

import { randomUUID } from "node:crypto";

import { CORRELATION_HEADER, runWithContext } from "./context";
import { toErrorResponse } from "./errors";
import { log } from "./logging";

/**
 * The inbound BFF boundary. Every route handler runs inside this: it establishes
 * a request-scoped correlation id (honoring one the caller already sent), maps
 * any thrown error onto the safe `{detail, code}` envelope, echoes the id on the
 * response, and logs the request's outcome exactly once. Handlers pass only their
 * happy path, so error mapping and boundary logging live here, not in each one.
 */
export function route(
  request: Request,
  handler: () => Promise<Response>,
): Promise<Response> {
  const correlationId = request.headers.get(CORRELATION_HEADER) ?? randomUUID();
  return runWithContext({ correlationId }, async () => {
    const start = performance.now();
    let response: Response;
    try {
      response = await handler();
    } catch (error) {
      response = toErrorResponse(error);
    }
    response.headers.set(CORRELATION_HEADER, correlationId);
    log[response.ok ? "info" : "error"]("bff.request", {
      method: request.method,
      path: new URL(request.url).pathname,
      status: response.status,
      duration_ms: Math.round(performance.now() - start),
      correlation_id: correlationId,
    });
    return response;
  });
}
