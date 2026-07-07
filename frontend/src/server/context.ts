import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request-scoped context, carried across awaits without threading it through
 * every function signature. Established once per inbound `/api` request by the
 * route wrapper; read by the downstream HTTP client and the error mapper so a
 * single correlation id ties the inbound request, its upstream calls, and any
 * error response together.
 */

/** The header the correlation id travels on, inbound from the caller and
 *  outbound to the two backends. */
export const CORRELATION_HEADER = "x-correlation-id";

interface RequestContext {
  correlationId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

/** The current request's correlation id, or `undefined` outside a request. */
export function getCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}
