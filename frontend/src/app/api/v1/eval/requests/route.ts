import { NextResponse, type NextRequest } from "next/server";

import { clampLimit } from "@/lib/pagination";
import { getEvalServiceClient } from "@/server/eval-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limit = clampLimit(request.nextUrl.searchParams.get("limit"));
  return NextResponse.json(await getEvalServiceClient().listRequests(limit));
}
