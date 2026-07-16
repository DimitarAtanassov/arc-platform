import { NextResponse, type NextRequest } from "next/server";

import { evaluateRequestSchema } from "@/lib/api/schemas";
import { route } from "@/server/handler";
import { getEvalServiceClient } from "@/server/eval-service";
import { getModelLabClient } from "@/server/model-lab";
import { parseJsonBody } from "@/server/request";

export const dynamic = "force-dynamic";

export function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inferenceId: string }> },
) {
  return route(request, async () => {
    const { inferenceId } = await params;
    const body = await parseJsonBody(request, evaluateRequestSchema);
    if (!body.ok) {
      return body.response;
    }
    // The evaluator scores supplied text, so resolve the inference from the lab
    // and hand its input and output to the evaluator.
    const inference = await getModelLabClient().getInference(inferenceId);
    const envelope = await getEvalServiceClient().evaluate({
      inputText: inference.inputText,
      outputText: inference.outputText,
      metrics: body.data.metrics,
    });
    return NextResponse.json(envelope);
  });
}
