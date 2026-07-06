import { NextResponse, type NextRequest } from "next/server";

import { experimentRunRequestSchema } from "@/lib/api/schemas";
import { toErrorResponse } from "@/server/errors";
import { getModelLabClient } from "@/server/model-lab";
import { parseJsonBody } from "@/server/request";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ experimentId: string }> },
) {
  const { experimentId } = await params;
  const body = await parseJsonBody(request, experimentRunRequestSchema);
  if (!body.ok) {
    return body.response;
  }
  try {
    const result = await getModelLabClient().runExperiment(experimentId, {
      inputText: body.data.inputText,
      metrics: body.data.metrics,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
