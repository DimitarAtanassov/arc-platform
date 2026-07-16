import { NextResponse, type NextRequest } from "next/server";

import { route } from "@/server/handler";
import { getModelLabClient } from "@/server/model-lab";

export const dynamic = "force-dynamic";

/**
 * The decoding parameter registry and effective output-token cap the UI renders
 * controls from. Proxies `GET /generation/params`; the client caches per process.
 */
export function GET(request: NextRequest) {
  return route(request, async () => {
    return NextResponse.json(await getModelLabClient().getGenerationParams());
  });
}
