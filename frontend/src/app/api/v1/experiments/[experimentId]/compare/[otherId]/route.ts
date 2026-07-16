import { NextResponse } from "next/server";

import { route } from "@/server/handler";
import { getEvalServiceClient } from "@/server/eval-service";

export const dynamic = "force-dynamic";

export function GET(
  request: Request,
  { params }: { params: Promise<{ experimentId: string; otherId: string }> },
) {
  return route(request, async () => {
    const { experimentId, otherId } = await params;
    return NextResponse.json(
      await getEvalServiceClient().compareExperiments(experimentId, otherId),
    );
  });
}
