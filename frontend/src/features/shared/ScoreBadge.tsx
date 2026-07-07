import { Badge } from "@/components/ui";
import { formatScore } from "@/lib/format";

interface ScoreBadgeProps {
  score: number;
  /** When known (persisted results), the judge's own pass/fail decides tone. */
  passed?: boolean;
}

/**
 * A metric score as a tone-coded pill. When a pass/fail is known it drives the
 * tone; otherwise the tone is banded off the raw score so a low score reads as a
 * warning without implying a hard failure.
 */
export function ScoreBadge({ score, passed }: ScoreBadgeProps) {
  const tone =
    passed === undefined
      ? score >= 0.8
        ? "success"
        : score >= 0.5
          ? "warning"
          : "danger"
      : passed
        ? "success"
        : "danger";
  return <Badge tone={tone}>{formatScore(score)}</Badge>;
}
