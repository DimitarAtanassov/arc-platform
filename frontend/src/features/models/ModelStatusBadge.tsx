import { Badge } from "@/components/ui";
import type { ModelStatus } from "@/lib/api/schemas";

type Tone = "success" | "info" | "warning" | "neutral";

const TONE: Record<ModelStatus, Tone> = {
  available: "success",
  preview: "info",
  deprecated: "warning",
  retired: "neutral",
};

const LABEL: Record<ModelStatus, string> = {
  available: "Available",
  preview: "Preview",
  deprecated: "Deprecated",
  retired: "Retired",
};

/** A quiet, semantic status pill for a model's lifecycle state. */
export function ModelStatusBadge({ status }: { status: ModelStatus }) {
  return (
    <Badge tone={TONE[status]} dot>
      {LABEL[status]}
    </Badge>
  );
}
