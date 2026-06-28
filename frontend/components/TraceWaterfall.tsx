import { formatLatency } from "@/lib/format";
import type { Span, Trace } from "@/lib/types";

// Order spans depth-first so children render under their parent, producing a
// readable tree even though the API returns a flat list.
function orderSpans(spans: Span[]): Array<{ span: Span; depth: number }> {
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
  walk(null, 0);
  return ordered;
}

export default function TraceWaterfall({ trace }: { trace: Trace }) {
  const total = trace.duration_ms || 1;
  const ordered = orderSpans(trace.spans);

  return (
    <div className="waterfall">
      {ordered.map(({ span, depth }) => {
        const left = (span.start_offset_ms / total) * 100;
        const width = Math.max((span.duration_ms / total) * 100, 0.5);
        return (
          <div className="wf-row" key={span.span_id}>
            <div className="wf-label" style={{ paddingLeft: depth * 16 }}>
              <span className="wf-name">{span.name}</span>
            </div>
            <div className="wf-track">
              <div
                className="wf-bar"
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${span.name} — ${formatLatency(span.duration_ms)}`}
              />
            </div>
            <div className="wf-dur num">{formatLatency(span.duration_ms)}</div>
          </div>
        );
      })}
    </div>
  );
}
