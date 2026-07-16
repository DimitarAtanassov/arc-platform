import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui";
import { CreateExperimentForm } from "@/features/experiments/CreateExperimentForm";
import { ExperimentsTable } from "@/features/experiments/ExperimentsTable";

export const metadata: Metadata = { title: "Experiments" };

export default function ExperimentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Console"
        title="Experiments"
        description="Define a metric set, build a dataset of completed interactions, and compare aggregated scores across runs."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <CreateExperimentForm />
        <Panel title="All experiments" flush>
          <ExperimentsTable />
        </Panel>
      </div>
    </div>
  );
}
