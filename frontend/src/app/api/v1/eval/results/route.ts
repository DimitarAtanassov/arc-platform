import { NextResponse, type NextRequest } from "next/server";

import { clampLimit } from "@/lib/pagination";
import { getEvalServiceClient } from "@/server/eval-service";
import { route } from "@/server/handler";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return route(request, async () => {
    const params = request.nextUrl.searchParams;
    const results = await getEvalServiceClient().listResults({
      limit: clampLimit(params.get("limit")),
      metric: params.get("metric"),
      modelId: params.get("modelId"),
    });
    return NextResponse.json(results);
  });
}
