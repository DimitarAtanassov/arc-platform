import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { InferenceLab } from "@/features/inference/InferenceLab";

export const metadata: Metadata = { title: "Inference Lab" };

export default function LabPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Console"
        title="Inference Lab"
        description="Run a single inference against a chosen model and read the raw result."
      />
      <InferenceLab />
    </div>
  );
}
