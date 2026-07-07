import { Badge } from "@/components/ui";
import type { EvaluationEnvelope } from "@/lib/api/schemas";

import { ScoreBadge } from "../shared/ScoreBadge";

const STATUS_TONE = {
  completed: "success",
  skipped: "neutral",
  failed: "danger",
} as const;

const STATUS_NOTE: Record<EvaluationEnvelope["status"], string> = {
  completed: "",
  skipped: "No evaluator is configured for this environment.",
  failed: "The evaluator was unreachable; the inference was left untouched.",
};

/** Renders the outcome of an evaluation attempt: status plus a score per metric. */
export function EvaluationResults({
  evaluation,
}: {
  evaluation: EvaluationEnvelope;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-text-muted">Status</span>
        <Badge tone={STATUS_TONE[evaluation.status]}>{evaluation.status}</Badge>
      </div>
      {evaluation.results.length === 0 ? (
        <p className="text-[13px] text-text-faint">
          No scores returned. {STATUS_NOTE[evaluation.status]}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {evaluation.results.map((result) => (
            <li
              key={`${result.metricName}:${result.evaluatorName}`}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm text-text">{result.metricName}</div>
                <div className="text-[11px] text-text-faint">
                  {result.evaluatorName}
                  {result.evaluatorVersion
                    ? ` · ${result.evaluatorVersion}`
                    : ""}
                </div>
              </div>
              <ScoreBadge score={result.score} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
