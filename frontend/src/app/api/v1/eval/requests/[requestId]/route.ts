import { NextResponse } from "next/server";

import { getEvalServiceClient } from "@/server/eval-service";
import { route } from "@/server/handler";

export const dynamic = "force-dynamic";

export function GET(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  return route(request, async () => {
    const { requestId } = await params;
    return NextResponse.json(
      await getEvalServiceClient().getRequest(requestId),
    );
  });
}
