import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";

/**
 * Parse and validate a JSON request body against a Zod schema at the BFF edge.
 * On failure it returns a ready 400 response with the standard `{detail, code}`
 * envelope, so every write handler rejects malformed input the same way.
 */
export async function parseJsonBody<S extends z.ZodTypeAny>(
  request: NextRequest,
  schema: S,
): Promise<
  { ok: true; data: z.output<S> } | { ok: false; response: NextResponse }
> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { detail: "invalid request body", code: "invalid_request" },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}
