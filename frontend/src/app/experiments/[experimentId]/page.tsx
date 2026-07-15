import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { ExperimentDetailView } from "@/features/experiments/ExperimentDetailView";

export const metadata: Metadata = { title: "Experiment" };

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ experimentId: string }>;
}) {
  const { experimentId } = await params;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Experiments"
        title="Experiment"
        description="Dataset, runs, aggregated results, and comparison."
      />
      <ExperimentDetailView experimentId={decodeURIComponent(experimentId)} />
    </div>
  );
}
