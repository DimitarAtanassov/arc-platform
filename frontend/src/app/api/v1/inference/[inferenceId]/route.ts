import { NextResponse } from "next/server";

import { route } from "@/server/handler";
import { getModelLabClient } from "@/server/model-lab";

export const dynamic = "force-dynamic";

export function GET(
  request: Request,
  { params }: { params: Promise<{ inferenceId: string }> },
) {
  return route(request, async () => {
    const { inferenceId } = await params;
    return NextResponse.json(
      await getModelLabClient().getInference(inferenceId),
    );
  });
}
