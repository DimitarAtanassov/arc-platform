import { NextResponse, type NextRequest } from "next/server";

import { experimentCreateRequestSchema } from "@/lib/api/schemas";
import { clampLimit } from "@/lib/pagination";
import { toErrorResponse } from "@/server/errors";
import { getModelLabClient } from "@/server/model-lab";
import { parseJsonBody } from "@/server/request";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limit = clampLimit(request.nextUrl.searchParams.get("limit"));
  return NextResponse.json(await getModelLabClient().listExperiments(limit));
}

export async function POST(request: NextRequest) {
  const body = await parseJsonBody(request, experimentCreateRequestSchema);
  if (!body.ok) {
    return body.response;
  }
  try {
    const experiment = await getModelLabClient().createExperiment({
      name: body.data.name,
      description: body.data.description,
      modelName: body.data.modelName,
      generationConfig: body.data.generationConfig,
    });
    return NextResponse.json(experiment, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
