import { NextResponse, type NextRequest } from "next/server";

import { inferenceRequestSchema } from "@/lib/api/schemas";
import { toErrorResponse } from "@/server/errors";
import { getModelLabClient } from "@/server/model-lab";

export const dynamic = "force-dynamic";

function clampLimit(raw: string | null): number {
  const value = Number(raw ?? 50);
  if (!Number.isFinite(value)) {
    return 50;
  }
  return Math.min(200, Math.max(1, Math.trunc(value)));
}

export async function GET(request: NextRequest) {
  const limit = clampLimit(request.nextUrl.searchParams.get("limit"));
  return NextResponse.json(await getModelLabClient().listInferences(limit));
}

export async function POST(request: NextRequest) {
  const parsed = inferenceRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { detail: "invalid request body", code: "invalid_request" },
      { status: 400 },
    );
  }
  try {
    const detail = await getModelLabClient().runInference(parsed.data);
    return NextResponse.json(detail, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
