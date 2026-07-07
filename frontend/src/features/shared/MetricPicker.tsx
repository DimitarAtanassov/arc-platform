"use client";

import { Spinner } from "@/components/ui";
import { useMetrics } from "@/lib/api/queries";
import { cn } from "@/lib/utils";

interface MetricPickerProps {
  value: string[];
  onChange: (metrics: string[]) => void;
  disabled?: boolean;
}

/**
 * A toggle-chip selector over the arc-eval-service metric catalog. Used wherever
 * a caller chooses which metrics to score against (the lab, an inference detail,
 * an experiment run). The rubric is surfaced as the chip's title.
 */
export function MetricPicker({ value, onChange, disabled }: MetricPickerProps) {
  const { data, isLoading } = useMetrics();
  const metrics = data ?? [];

  const toggle = (name: string) => {
    onChange(
      value.includes(name)
        ? value.filter((metric) => metric !== name)
        : [...value, name],
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Spinner /> Loading metrics...
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <p className="text-[13px] text-text-faint">
        No metrics available. Check that arc-eval-service is reachable.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {metrics.map((metric) => {
        const selected = value.includes(metric.name);
        return (
          <button
            key={metric.name}
            type="button"
            disabled={disabled}
            onClick={() => toggle(metric.name)}
            title={metric.rubric}
            aria-pressed={selected}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50",
              selected
                ? "border-[var(--accent-border)] bg-accent-muted text-accent"
                : "border-border bg-surface text-text-muted hover:border-border-strong hover:text-text",
            )}
          >
            {metric.name}
          </button>
        );
      })}
    </div>
  );
}
