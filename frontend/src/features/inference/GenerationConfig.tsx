import { SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui";

const PARAMS = ["Temperature", "Max tokens", "Top-p"] as const;

/**
 * A placeholder for sampling parameters. Rendered disabled so the intent is
 * clear without implying a capability that is not wired yet: runs currently use
 * each model's defaults.
 */
export function GenerationConfig() {
  return (
    <fieldset
      disabled
      className="rounded-lg border border-dashed border-border bg-surface-subtle p-4"
    >
      <div className="flex items-center justify-between">
        <legend className="flex items-center gap-2 text-sm font-medium text-text">
          <SlidersHorizontal className="size-4 text-text-faint" />
          Generation config
        </legend>
        <Badge tone="neutral">Planned</Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {PARAMS.map((label) => (
          <div key={label} className="space-y-1">
            <span className="block text-[11px] uppercase tracking-wider text-text-faint">
              {label}
            </span>
            <div className="h-8 rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-[12px] text-text-faint">
              default
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-text-muted">
        Sampling parameters are not configurable yet. Runs use each model&apos;s
        defaults.
      </p>
    </fieldset>
  );
}
