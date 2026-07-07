import { NextResponse } from "next/server";

import { getEvalServiceClient } from "@/server/eval-service";
import { route } from "@/server/handler";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return route(request, async () =>
    NextResponse.json(await getEvalServiceClient().listMetrics()),
  );
}
