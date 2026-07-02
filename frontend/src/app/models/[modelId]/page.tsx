import type { Metadata } from "next";

import { ModelDetailView } from "@/features/models/ModelDetailView";

export const metadata: Metadata = { title: "Model" };

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ modelId: string }>;
}) {
  const { modelId } = await params;
  return <ModelDetailView modelId={decodeURIComponent(modelId)} />;
}
