import { NextResponse } from "next/server";

import { route } from "@/server/handler";
import { getModelLabClient } from "@/server/model-lab";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return route(request, async () => {
    const models = await getModelLabClient().listModels();
    return NextResponse.json(models);
  });
}
