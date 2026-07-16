import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { InferenceLab } from "@/features/inference/InferenceLab";

export const metadata: Metadata = { title: "Playground" };

export default function LabPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Console"
        title="Playground"
        description="Run a single inference against a chosen model, read the raw result, and score it in place."
      />
      <InferenceLab />
    </div>
  );
}
