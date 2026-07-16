import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { EvaluationsExplorer } from "@/features/evaluations/EvaluationsExplorer";
import { QuickEvalLauncher } from "@/features/evaluations/QuickEvalLauncher";

export const metadata: Metadata = { title: "Evaluations" };

export default function EvaluationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Console"
        title="Evaluations"
        description="Run a one-off evaluation, or browse the metric catalog and every evaluation arc-eval-service has recorded."
        actions={<QuickEvalLauncher />}
      />
      <EvaluationsExplorer />
    </div>
  );
}
