import { NextResponse, type NextRequest } from "next/server";

import { evaluateInteractionRequestSchema } from "@/lib/api/schemas";
import { getEvalServiceClient } from "@/server/eval-service";
import { route } from "@/server/handler";
import { parseJsonBody } from "@/server/request";

export const dynamic = "force-dynamic";

/**
 * Score a standalone interaction. The caller supplies the input, the output, and
 * the metrics directly, so unlike the inference-scoped evaluate route this needs
 * no lab lookup: it validates the body and hands it straight to the evaluator.
 */
export function POST(request: NextRequest) {
  return route(request, async () => {
    const body = await parseJsonBody(request, evaluateInteractionRequestSchema);
    if (!body.ok) {
      return body.response;
    }
    const envelope = await getEvalServiceClient().evaluate({
      inputText: body.data.inputText,
      outputText: body.data.outputText,
      metrics: body.data.metrics,
    });
    return NextResponse.json(envelope);
  });
}
