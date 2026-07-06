import { NextResponse, type NextRequest } from "next/server";

import { inferenceRunRequestSchema } from "@/lib/api/schemas";
import { clampLimit } from "@/lib/pagination";
import { toErrorResponse } from "@/server/errors";
import { getModelLabClient } from "@/server/model-lab";
import { parseJsonBody } from "@/server/request";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limit = clampLimit(request.nextUrl.searchParams.get("limit"));
  return NextResponse.json(await getModelLabClient().listInferences(limit));
}

export async function POST(request: NextRequest) {
  const body = await parseJsonBody(request, inferenceRunRequestSchema);
  if (!body.ok) {
    return body.response;
  }
  try {
    const detail = await getModelLabClient().runInference({
      modelName: body.data.modelName,
      inputText: body.data.inputText,
      temperature: body.data.temperature,
    });
    return NextResponse.json(detail, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
