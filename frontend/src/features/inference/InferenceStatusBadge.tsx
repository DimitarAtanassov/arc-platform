import { Badge } from "@/components/ui";
import type { InferenceStatus } from "@/lib/api/schemas";

type Tone = "success" | "danger" | "info" | "neutral";

const TONE: Record<InferenceStatus, Tone> = {
  succeeded: "success",
  failed: "danger",
  running: "info",
  queued: "neutral",
};

const LABEL: Record<InferenceStatus, string> = {
  succeeded: "Succeeded",
  failed: "Failed",
  running: "Running",
  queued: "Queued",
};

/** A quiet, semantic pill for an inference run's state. */
export function InferenceStatusBadge({ status }: { status: InferenceStatus }) {
  return (
    <Badge tone={TONE[status]} dot>
      {LABEL[status]}
    </Badge>
  );
}
