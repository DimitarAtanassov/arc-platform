import { NextResponse } from "next/server";

import { getModelLabClient } from "@/server/model-lab";

export const dynamic = "force-dynamic";

export async function GET() {
  const models = await getModelLabClient().listModels();
  return NextResponse.json(models);
}
