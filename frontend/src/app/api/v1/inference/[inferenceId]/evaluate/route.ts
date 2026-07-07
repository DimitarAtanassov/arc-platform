import { NextResponse, type NextRequest } from "next/server";

import { evaluateRequestSchema } from "@/lib/api/schemas";
import { route } from "@/server/handler";
import { getModelLabClient } from "@/server/model-lab";
import { parseJsonBody } from "@/server/request";

export const dynamic = "force-dynamic";

export function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inferenceId: string }> },
) {
  return route(request, async () => {
    const { inferenceId } = await params;
    const body = await parseJsonBody(request, evaluateRequestSchema);
    if (!body.ok) {
      return body.response;
    }
    const envelope = await getModelLabClient().evaluateInference(
      inferenceId,
      body.data.metrics,
    );
    return NextResponse.json(envelope);
  });
}
