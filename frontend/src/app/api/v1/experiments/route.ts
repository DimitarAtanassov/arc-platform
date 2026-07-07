import { NextResponse, type NextRequest } from "next/server";

import { experimentCreateRequestSchema } from "@/lib/api/schemas";
import { clampLimit } from "@/lib/pagination";
import { route } from "@/server/handler";
import { getModelLabClient } from "@/server/model-lab";
import { parseJsonBody } from "@/server/request";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return route(request, async () => {
    const limit = clampLimit(request.nextUrl.searchParams.get("limit"));
    return NextResponse.json(await getModelLabClient().listExperiments(limit));
  });
}

export function POST(request: NextRequest) {
  return route(request, async () => {
    const body = await parseJsonBody(request, experimentCreateRequestSchema);
    if (!body.ok) {
      return body.response;
    }
    const experiment = await getModelLabClient().createExperiment({
      name: body.data.name,
      description: body.data.description,
      modelName: body.data.modelName,
      generationConfig: body.data.generationConfig,
    });
    return NextResponse.json(experiment, { status: 201 });
  });
}
