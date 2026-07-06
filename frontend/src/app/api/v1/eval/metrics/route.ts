import { NextResponse } from "next/server";

import { getEvalServiceClient } from "@/server/eval-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getEvalServiceClient().listMetrics());
}
