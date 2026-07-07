import "server-only";

import type { BackendConfig } from "./config";
import { CORRELATION_HEADER, getCorrelationId } from "./context";
import {
  NotFoundError,
  UpstreamError,
  UpstreamUnavailableError,
} from "./errors";
import { log } from "./logging";
import { isRecord, type JsonRecord } from "./mapping";

/**
 * Shared HTTP mechanics for the BFF's two downstreams (arc-model-lab and
 * arc-eval-service). Both speak JSON and share one degrade policy, so the fetch,
 * timeout, and error-mapping logic lives here once rather than in each client.
 *
 * The policy: list reads degrade to an empty array when a service is unreachable
 * (a surface still renders), while single-resource reads and writes fail loudly
 * with a typed error the route handlers turn into a safe `{detail, code}`
 * response.
 */

export type { JsonRecord };

export interface NotFoundTarget {
  resource: string;
  identifier: string;
}

export class BackendClient {
  constructor(
    protected readonly service: string,
    protected readonly config: BackendConfig,
  ) {}

  protected async fetchUpstream(
    path: string,
    timeoutMs: number,
    init?: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const method = init?.method ?? "GET";
    const correlationId = getCorrelationId();
    const start = performance.now();
    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        cache: "no-store",
        headers: {
          accept: "application/json",
          ...(correlationId ? { [CORRELATION_HEADER]: correlationId } : {}),
          ...(init?.headers ?? {}),
        },
      });
      log.info("bff.upstream", {
        service: this.service,
        method,
        path,
        status: response.status,
        duration_ms: Math.round(performance.now() - start),
        correlation_id: correlationId,
      });
      return response;
    } catch {
      log.warn("bff.upstream_unreachable", {
        service: this.service,
        method,
        path,
        duration_ms: Math.round(performance.now() - start),
        correlation_id: correlationId,
      });
      throw new UpstreamUnavailableError(`${this.service} is unreachable`);
    } finally {
      clearTimeout(timer);
    }
  }

  /** A list read. Degrades to an empty array on any failure so the UI renders. */
  protected async getList(
    path: string,
    timeoutMs: number = this.config.timeoutMs,
  ): Promise<JsonRecord[]> {
    try {
      const response = await this.fetchUpstream(path, timeoutMs);
      if (!response.ok) {
        return [];
      }
      const body: unknown = await response.json();
      return Array.isArray(body) ? body.filter(isRecord) : [];
    } catch {
      return [];
    }
  }

  /** A single-resource read. 404 becomes NotFound; other failures fail loudly. */
  protected async getOne(
    path: string,
    target: NotFoundTarget,
    timeoutMs: number = this.config.timeoutMs,
  ): Promise<JsonRecord> {
    const response = await this.fetchUpstream(path, timeoutMs);
    return this.readBody(response, target);
  }

  /** A write (or an action). 404 maps to NotFound; other non-2xx fail loudly. */
  protected async sendJson(
    method: "POST" | "PUT" | "PATCH",
    path: string,
    body: JsonRecord,
    timeoutMs: number,
    target?: NotFoundTarget,
  ): Promise<JsonRecord> {
    const response = await this.fetchUpstream(path, timeoutMs, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return this.readBody(response, target);
  }

  private async readBody(
    response: Response,
    target?: NotFoundTarget,
  ): Promise<JsonRecord> {
    if (response.status === 404 && target) {
      throw new NotFoundError(target.resource, target.identifier);
    }
    if (!response.ok) {
      throw new UpstreamError(await this.detail(response));
    }
    const body: unknown = await response.json().catch(() => null);
    if (!isRecord(body)) {
      throw new UpstreamError(`unexpected response shape from ${this.service}`);
    }
    return body;
  }

  /** Liveness probe for the overview surface. Never throws; returns a boolean. */
  async ping(path = "/health"): Promise<boolean> {
    try {
      const response = await this.fetchUpstream(path, this.config.timeoutMs);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async detail(response: Response): Promise<string> {
    try {
      const body: unknown = await response.json();
      if (isRecord(body) && typeof body.detail === "string") {
        return body.detail;
      }
    } catch {
      // Fall through to the status-based message.
    }
    return `${this.service} returned ${response.status}`;
  }
}
