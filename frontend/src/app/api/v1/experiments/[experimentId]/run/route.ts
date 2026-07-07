import { NextResponse, type NextRequest } from "next/server";

import { experimentRunRequestSchema } from "@/lib/api/schemas";
import { route } from "@/server/handler";
import { getModelLabClient } from "@/server/model-lab";
import { parseJsonBody } from "@/server/request";

export const dynamic = "force-dynamic";

export function POST(
  request: NextRequest,
  { params }: { params: Promise<{ experimentId: string }> },
) {
  return route(request, async () => {
    const { experimentId } = await params;
    const body = await parseJsonBody(request, experimentRunRequestSchema);
    if (!body.ok) {
      return body.response;
    }
    const result = await getModelLabClient().runExperiment(experimentId, {
      inputText: body.data.inputText,
      metrics: body.data.metrics,
    });
    return NextResponse.json(result, { status: 201 });
  });
}
