import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { getModelLabClient } from "@/server/model-lab";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  try {
    return NextResponse.json(await getModelLabClient().getModel(name));
  } catch (error) {
    return toErrorResponse(error);
  }
}
