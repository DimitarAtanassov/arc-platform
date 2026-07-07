import { NextResponse } from "next/server";

import { getEvalServiceClient } from "@/server/eval-service";
import { route } from "@/server/handler";
import { getModelLabClient } from "@/server/model-lab";

export const dynamic = "force-dynamic";

/**
 * Liveness of the two backends the console drives, for the overview surface.
 * Each probe degrades to `false` rather than throwing, so one service being down
 * never fails the whole check.
 */
export function GET(request: Request) {
  return route(request, async () => {
    const [modelLab, evalService] = await Promise.all([
      getModelLabClient().ping(),
      getEvalServiceClient().ping(),
    ]);
    return NextResponse.json({ modelLab, evalService });
  });
}
