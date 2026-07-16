import { NextResponse, type NextRequest } from "next/server";

import { buildInferenceRunRequestSchema } from "@/lib/api/schemas";
import { clampLimit } from "@/lib/pagination";
import { route } from "@/server/handler";
import { getModelLabClient } from "@/server/model-lab";
import { parseJsonBody } from "@/server/request";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return route(request, async () => {
    const limit = clampLimit(request.nextUrl.searchParams.get("limit"));
    return NextResponse.json(await getModelLabClient().listInferences(limit));
  });
}

export function POST(request: NextRequest) {
  return route(request, async () => {
    const client = getModelLabClient();
    // model_params bounds mirror the registry, and the max_output_tokens ceiling
    // is the effective server cap read from the registry, never hardcoded.
    const { maxOutputTokensCap } = await client.getGenerationParams();
    const body = await parseJsonBody(
      request,
      buildInferenceRunRequestSchema(maxOutputTokensCap),
    );
    if (!body.ok) {
      return body.response;
    }
    const detail = await client.runInference({
      modelName: body.data.modelName,
      inputText: body.data.inputText,
      presetId: body.data.presetId,
      modelParams: body.data.modelParams,
    });
    return NextResponse.json(detail, { status: 201 });
  });
}
