import { NextResponse, type NextRequest } from "next/server";

import { evaluateRequestSchema } from "@/lib/api/schemas";
import { toErrorResponse } from "@/server/errors";
import { getModelLabClient } from "@/server/model-lab";
import { parseJsonBody } from "@/server/request";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inferenceId: string }> },
) {
  const { inferenceId } = await params;
  const body = await parseJsonBody(request, evaluateRequestSchema);
  if (!body.ok) {
    return body.response;
  }
  try {
    const envelope = await getModelLabClient().evaluateInference(
      inferenceId,
      body.data.metrics,
    );
    return NextResponse.json(envelope);
  } catch (error) {
    return toErrorResponse(error);
  }
}
