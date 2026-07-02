import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { ModelsTable } from "@/features/models/ModelsTable";

export const metadata: Metadata = { title: "Models" };

export default function ModelsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Console"
        title="Models"
        description="Browse the models arc-model-lab exposes."
      />
      <ModelsTable />
    </div>
  );
}
