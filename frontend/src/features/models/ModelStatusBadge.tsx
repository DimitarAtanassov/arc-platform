import { Badge } from "@/components/ui";
import type { ModelStatus } from "@/lib/api/schemas";

const TONES: Record<ModelStatus, "success" | "neutral" | "warning"> = {
  active: "success",
  inactive: "neutral",
  deprecated: "warning",
};

/** A model's serving status. Active is the only state eligible for inference. */
export function ModelStatusBadge({ status }: { status: ModelStatus }) {
  return (
    <Badge tone={TONES[status] ?? "neutral"} dot>
      {status}
    </Badge>
  );
}
