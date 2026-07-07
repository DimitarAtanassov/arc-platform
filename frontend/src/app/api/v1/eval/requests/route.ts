import { NextResponse, type NextRequest } from "next/server";

import { clampLimit } from "@/lib/pagination";
import { getEvalServiceClient } from "@/server/eval-service";
import { route } from "@/server/handler";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return route(request, async () => {
    const limit = clampLimit(request.nextUrl.searchParams.get("limit"));
    return NextResponse.json(await getEvalServiceClient().listRequests(limit));
  });
}
