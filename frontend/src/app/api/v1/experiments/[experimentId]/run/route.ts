import { NextResponse, type NextRequest } from "next/server";

import { route } from "@/server/handler";
import { getEvalServiceClient } from "@/server/eval-service";

export const dynamic = "force-dynamic";

export function POST(
  request: NextRequest,
  { params }: { params: Promise<{ experimentId: string }> },
) {
  return route(request, async () => {
    const { experimentId } = await params;
    const result = await getEvalServiceClient().runExperiment(experimentId);
    return NextResponse.json(result, { status: 201 });
  });
}
