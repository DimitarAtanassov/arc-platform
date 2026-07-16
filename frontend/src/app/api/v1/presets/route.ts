import { NextResponse, type NextRequest } from "next/server";

import { buildPresetCreateRequestSchema } from "@/lib/api/schemas";
import { route } from "@/server/handler";
import { getModelLabClient } from "@/server/model-lab";
import { parseJsonBody } from "@/server/request";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return route(request, async () => {
    return NextResponse.json(await getModelLabClient().listPresets());
  });
}

export function POST(request: NextRequest) {
  return route(request, async () => {
    const client = getModelLabClient();
    // The max_output_tokens ceiling is server-authoritative, so validate the
    // config against the effective cap read from the registry, not a constant.
    const { maxOutputTokensCap } = await client.getGenerationParams();
    const body = await parseJsonBody(
      request,
      buildPresetCreateRequestSchema(maxOutputTokensCap),
    );
    if (!body.ok) {
      return body.response;
    }
    const preset = await client.createPreset({
      name: body.data.name,
      description: body.data.description,
      config: body.data.config,
    });
    return NextResponse.json(preset, { status: 201 });
  });
}
