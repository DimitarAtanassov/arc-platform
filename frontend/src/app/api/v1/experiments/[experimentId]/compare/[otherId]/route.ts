import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { getModelLabClient } from "@/server/model-lab";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ experimentId: string; otherId: string }> },
) {
  const { experimentId, otherId } = await params;
  try {
    return NextResponse.json(
      await getModelLabClient().compareExperiments(experimentId, otherId),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
