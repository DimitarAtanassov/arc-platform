import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { InferenceHistoryTable } from "@/features/inference/InferenceHistoryTable";

export const metadata: Metadata = { title: "History" };

export default function InferenceHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Console"
        title="Inference History"
        description="Inspect the inference runs arc-model-lab has persisted."
      />
      <InferenceHistoryTable />
    </div>
  );
}
