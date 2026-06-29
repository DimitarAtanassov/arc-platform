import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import Layout from "@/components/Layout";
import SpanInspector from "@/components/SpanInspector";
import TraceWaterfall from "@/components/TraceWaterfall";
import { ArrowLeft, ArrowRight } from "@/components/icons";
import { CopyId, Skeleton } from "@/components/ui";
import { api, useAsync } from "@/lib/api";
import { formatLatency, shortId } from "@/lib/format";
import type { Span } from "@/lib/types";

export default function TraceExplorerPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const { data, error } = useAsync(() => api.getTrace(id), [id]);
  const [selected, setSelected] = useState<Span | null>(null);

  // Default the inspector to the root span once a trace loads.
  useEffect(() => {
    if (data && !selected) {
      const root = data.spans.find((s) => s.parent_span_id === null) ?? data.spans[0] ?? null;
      setSelected(root);
    }
  }, [data, selected]);

  return (
    <Layout section="Traces" title={id ? shortId(id, 16) : "Trace"} wide>
      <Link href="/traces" className="back-link"><ArrowLeft size={15} /> All traces</Link>

      {error && <div className="alert alert--error">Failed to load trace: {error}</div>}
      {!error && !data && (
        <div className="card"><Skeleton height={18} width="40%" /><div style={{ height: 10 }} /><Skeleton height={180} /></div>
      )}

      {data && (
        <>
          <div className="card" style={{ marginBottom: "var(--gap)" }}>
            <dl className="meta-grid">
              <div className="meta-item">
                <dt>Trace ID</dt>
                <dd><CopyId value={data.trace_id} display={shortId(data.trace_id, 18)} /></dd>
              </div>
              <div className="meta-item">
                <dt>Request</dt>
                <dd>
                  <Link href={`/requests/${data.request_id}`} className="link inline">
                    {shortId(data.request_id, 16)} <ArrowRight size={13} />
                  </Link>
                </dd>
              </div>
              <div className="meta-item">
                <dt>Duration</dt>
                <dd className="mono">{formatLatency(data.duration_ms)}</dd>
              </div>
              <div className="meta-item">
                <dt>Spans</dt>
                <dd className="mono">{data.spans.length}</dd>
              </div>
            </dl>
          </div>

          <div className="split">
            <div className="card">
              <div className="card-head">
                <h2>Span waterfall</h2>
                <span className="muted" style={{ fontSize: 12.5 }}>Select a span to inspect</span>
              </div>
              <TraceWaterfall trace={data} selectedId={selected?.span_id} onSelect={setSelected} />
            </div>
            {selected && <SpanInspector span={selected} />}
          </div>
        </>
      )}
    </Layout>
  );
}
