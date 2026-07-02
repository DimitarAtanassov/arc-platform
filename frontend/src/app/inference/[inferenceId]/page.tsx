import type { Metadata } from "next";

import { InferenceDetailView } from "@/features/inference/InferenceDetailView";

export const metadata: Metadata = { title: "Inference" };

export default async function InferenceDetailPage({
  params,
}: {
  params: Promise<{ inferenceId: string }>;
}) {
  const { inferenceId } = await params;
  return <InferenceDetailView inferenceId={decodeURIComponent(inferenceId)} />;
}
