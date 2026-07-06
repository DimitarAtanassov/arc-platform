import { NextResponse } from "next/server";

import { getEvalServiceClient } from "@/server/eval-service";
import { getModelLabClient } from "@/server/model-lab";

export const dynamic = "force-dynamic";

/**
 * Liveness of the two backends the console drives, for the overview surface.
 * Each probe degrades to `false` rather than throwing, so one service being down
 * never fails the whole check.
 */
export async function GET() {
  const [modelLab, evalService] = await Promise.all([
    getModelLabClient().ping(),
    getEvalServiceClient().ping(),
  ]);
  return NextResponse.json({ modelLab, evalService });
}
