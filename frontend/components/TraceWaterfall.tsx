import { formatLatency } from "@/lib/format";
import type { Span, Trace } from "@/lib/types";

// Order spans depth-first so children render under their parent, producing a
// readable tree even though the API returns a flat list.
export function orderSpans(spans: Span[]): Array<{ span: Span; depth: number }> {
  const byParent = new Map<string | null, Span[]>();
  for (const span of spans) {
    const key = span.parent_span_id;
    const bucket = byParent.get(key) ?? [];
    bucket.push(span);
    byParent.set(key, bucket);
  }
  const ordered: Array<{ span: Span; depth: number }> = [];
  const walk = (parent: string | null, depth: number): void => {
    const children = (byParent.get(parent) ?? []).sort(
      (a, b) => a.start_offset_ms - b.start_offset_ms,
    );
    for (const span of children) {
      ordered.push({ span, depth });
      walk(span.span_id, depth + 1);
    }
  };
  // Roots = spans whose parent isn't present (covers a null root or orphaned).
  const present = new Set(spans.map((s) => s.span_id));
  const rootKeys = [...byParent.keys()].filter((k) => k === null || !present.has(k));
  for (const key of rootKeys) walk(key, 0);
  return ordered;
}

function barClass(name: string): string {
  if (name.startsWith("arc.eval.")) return "wf-bar--eval";
  if (name.startsWith("llm.")) return "wf-bar--provider";
  return "";
}

export default function TraceWaterfall({
  trace,
  selectedId,
  onSelect,
}: {
  trace: Trace;
  selectedId?: string | null;
  onSelect?: (span: Span) => void;
}) {
  const total = trace.duration_ms || 1;
  const ordered = orderSpans(trace.spans);

  return (
    <div className="waterfall">
      <div className="wf-axis">
        <span>span</span>
        <span className="wf-axis-ticks">
          <span>0</span>
          <span>{formatLatency(total / 2)}</span>
          <span>{formatLatency(total)}</span>
        </span>
        <span style={{ textAlign: "right" }}>duration</span>
      </div>
      {ordered.map(({ span, depth }) => {
        const left = (span.start_offset_ms / total) * 100;
        const width = Math.max((span.duration_ms / total) * 100, 0.6);
        const active = span.span_id === selectedId;
        return (
          <div
            className={`wf-row${active ? " wf-row--active" : ""}`}
            key={span.span_id}
            onClick={() => onSelect?.(span)}
          >
            <div className="wf-label" style={{ paddingLeft: depth * 14 }}>
              {depth > 0 && <span className="wf-tick">└</span>}
              <span className="wf-name">{span.name}</span>
            </div>
            <div className="wf-track">
              <div
                className={`wf-bar ${barClass(span.name)}`}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${span.name} — ${formatLatency(span.duration_ms)}`}
              />
            </div>
            <div className="wf-dur">{formatLatency(span.duration_ms)}</div>
          </div>
        );
      })}
    </div>
  );
}
