import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { getEvalServiceClient } from "@/server/eval-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await params;
  try {
    return NextResponse.json(
      await getEvalServiceClient().getRequest(requestId),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
