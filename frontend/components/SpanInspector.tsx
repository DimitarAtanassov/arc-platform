import { CopyId } from "@/components/ui";
import { formatLatency } from "@/lib/format";
import type { Span } from "@/lib/types";

// Full span attributes, timing and lineage in a clean key/value layout —
// mono values, copy-on-click IDs.
export default function SpanInspector({ span }: { span: Span }) {
  const attrs = Object.entries(span.attributes);
  return (
    <div className="card panel-sticky">
      <div className="card-head">
        <h2>Span</h2>
        <span className="badge badge--accent">{formatLatency(span.duration_ms)}</span>
      </div>
      <div className="payload-label">Name</div>
      <div className="mono" style={{ marginBottom: 8 }}>{span.name}</div>

      <dl className="kv">
        <div className="kv-row">
          <dt>Span ID</dt>
          <dd><CopyId value={span.span_id} /></dd>
        </div>
        <div className="kv-row">
          <dt>Parent</dt>
          <dd>{span.parent_span_id ? <CopyId value={span.parent_span_id} /> : <span className="faint">root</span>}</dd>
        </div>
        <div className="kv-row">
          <dt>Start offset</dt>
          <dd>{formatLatency(span.start_offset_ms)}</dd>
        </div>
        <div className="kv-row">
          <dt>Duration</dt>
          <dd>{formatLatency(span.duration_ms)}</dd>
        </div>
      </dl>

      <div className="payload-label">Attributes</div>
      {attrs.length === 0 ? (
        <p className="faint" style={{ margin: 0, fontSize: 13 }}>No attributes on this span.</p>
      ) : (
        <dl className="kv">
          {attrs.map(([k, v], i) => (
            <div className={`kv-row${i === attrs.length - 1 ? "" : ""}`} key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
