import { NextResponse, type NextRequest } from "next/server";

import { buildPresetUpdateRequestSchema } from "@/lib/api/schemas";
import { route } from "@/server/handler";
import { getModelLabClient } from "@/server/model-lab";
import { parseJsonBody } from "@/server/request";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ presetId: string }> };

export function GET(request: NextRequest, { params }: Context) {
  return route(request, async () => {
    const { presetId } = await params;
    return NextResponse.json(await getModelLabClient().getPreset(presetId));
  });
}

export function PATCH(request: NextRequest, { params }: Context) {
  return route(request, async () => {
    const { presetId } = await params;
    const client = getModelLabClient();
    const { maxOutputTokensCap } = await client.getGenerationParams();
    const body = await parseJsonBody(
      request,
      buildPresetUpdateRequestSchema(maxOutputTokensCap),
    );
    if (!body.ok) {
      return body.response;
    }
    const preset = await client.updatePreset(presetId, {
      ...("description" in body.data
        ? { description: body.data.description }
        : {}),
      ...(body.data.config !== undefined ? { config: body.data.config } : {}),
    });
    return NextResponse.json(preset);
  });
}

export function DELETE(request: NextRequest, { params }: Context) {
  return route(request, async () => {
    const { presetId } = await params;
    await getModelLabClient().archivePreset(presetId);
    return new NextResponse(null, { status: 204 });
  });
}
