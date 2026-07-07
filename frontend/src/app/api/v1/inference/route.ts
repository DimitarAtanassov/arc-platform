import { NextResponse, type NextRequest } from "next/server";

import { inferenceRunRequestSchema } from "@/lib/api/schemas";
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
    const body = await parseJsonBody(request, inferenceRunRequestSchema);
    if (!body.ok) {
      return body.response;
    }
    const detail = await getModelLabClient().runInference({
      modelName: body.data.modelName,
      inputText: body.data.inputText,
      temperature: body.data.temperature,
    });
    return NextResponse.json(detail, { status: 201 });
  });
}
