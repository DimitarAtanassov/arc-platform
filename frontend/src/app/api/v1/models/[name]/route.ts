import { NextResponse } from "next/server";

import { route } from "@/server/handler";
import { getModelLabClient } from "@/server/model-lab";

export const dynamic = "force-dynamic";

export function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  return route(request, async () => {
    const { name } = await params;
    return NextResponse.json(await getModelLabClient().getModel(name));
  });
}
