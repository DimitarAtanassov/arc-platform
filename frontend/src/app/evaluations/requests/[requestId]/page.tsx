import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { EvalRequestDetailView } from "@/features/evaluations/EvalRequestDetailView";

export const metadata: Metadata = { title: "Evaluation request" };

export default async function EvalRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluations"
        title="Evaluation request"
        description="The scored interaction and the metric scores recorded against it."
      />
      <EvalRequestDetailView requestId={decodeURIComponent(requestId)} />
    </div>
  );
}
