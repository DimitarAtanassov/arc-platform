import { NextResponse, type NextRequest } from "next/server";

import { addDatasetRequestSchema } from "@/lib/api/schemas";
import { route } from "@/server/handler";
import { getEvalServiceClient } from "@/server/eval-service";
import { parseJsonBody } from "@/server/request";

export const dynamic = "force-dynamic";

export function GET(
  request: NextRequest,
  { params }: { params: Promise<{ experimentId: string }> },
) {
  return route(request, async () => {
    const { experimentId } = await params;
    return NextResponse.json(
      await getEvalServiceClient().listDataset(experimentId),
    );
  });
}

export function POST(
  request: NextRequest,
  { params }: { params: Promise<{ experimentId: string }> },
) {
  return route(request, async () => {
    const { experimentId } = await params;
    const body = await parseJsonBody(request, addDatasetRequestSchema);
    if (!body.ok) {
      return body.response;
    }
    const result = await getEvalServiceClient().addDataset(
      experimentId,
      body.data.entries,
    );
    return NextResponse.json(result, { status: 201 });
  });
}
