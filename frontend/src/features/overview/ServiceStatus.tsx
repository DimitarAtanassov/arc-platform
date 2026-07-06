"use client";

import { Badge, Spinner } from "@/components/ui";
import { useHealth } from "@/lib/api/queries";

function StatusRow({
  label,
  up,
  loading,
}: {
  label: string;
  up: boolean | undefined;
  loading: boolean;
}) {
  const tone = loading ? "neutral" : up ? "success" : "danger";
  const text = loading ? "checking" : up ? "reachable" : "unreachable";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[13px] text-text-muted">{label}</span>
      <Badge tone={tone} dot>
        {loading ? <Spinner className="size-3" /> : null}
        {text}
      </Badge>
    </div>
  );
}

/** Live reachability of the two backends the console drives. */
export function ServiceStatus() {
  const { data, isLoading } = useHealth();
  return (
    <div className="space-y-2.5">
      <StatusRow
        label="arc-model-lab"
        up={data?.modelLab}
        loading={isLoading}
      />
      <StatusRow
        label="arc-eval-service"
        up={data?.evalService}
        loading={isLoading}
      />
    </div>
  );
}
