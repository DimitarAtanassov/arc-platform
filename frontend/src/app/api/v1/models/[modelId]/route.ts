import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { getModelLabClient } from "@/server/model-lab";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ modelId: string }> },
) {
  const { modelId } = await params;
  try {
    return NextResponse.json(await getModelLabClient().getModel(modelId));
  } catch (error) {
    return toErrorResponse(error);
  }
}
