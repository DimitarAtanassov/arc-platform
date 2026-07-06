import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { ModelDetailView } from "@/features/models/ModelDetailView";

export const metadata: Metadata = { title: "Model" };

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Models"
        title={decoded}
        description="Catalog entry and the inferences run against this model."
      />
      <ModelDetailView name={decoded} />
    </div>
  );
}
