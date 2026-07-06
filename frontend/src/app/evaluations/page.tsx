import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { EvaluationsExplorer } from "@/features/evaluations/EvaluationsExplorer";

export const metadata: Metadata = { title: "Evaluations" };

export default function EvaluationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Console"
        title="Evaluations"
        description="Browse the metric catalog and every evaluation arc-eval-service has recorded."
      />
      <EvaluationsExplorer />
    </div>
  );
}
