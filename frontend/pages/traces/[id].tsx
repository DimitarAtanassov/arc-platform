import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

import Layout from "@/components/Layout";
import SpanInspector from "@/components/SpanInspector";
import TraceWaterfall from "@/components/TraceWaterfall";
import { ArrowLeft, ArrowRight } from "@/components/icons";
import { CopyId, GuardrailBadge, Skeleton, VerdictBadge } from "@/components/ui";
import { api, useAsync } from "@/lib/api";
import { formatLatency, shortId } from "@/lib/format";
import { serviceColor, traceRollup } from "@/lib/span";
import type { Span } from "@/lib/types";

export default function TraceExplorerPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const { data, error } = useAsync(() => api.getTrace(id), [id]);
  const [selected, setSelected] = useState<Span | null>(null);
  const rollup = useMemo(() => (data ? traceRollup(data.spans) : null), [data]);

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
        <>
          <div className="card" style={{ marginBottom: "var(--gap)" }}>
            <Skeleton height={14} width="30%" />
            <div style={{ height: 14 }} />
            <Skeleton height={48} />
          </div>
          <div className="split">
            <div className="card"><Skeleton height={18} width="40%" /><div style={{ height: 12 }} /><Skeleton height={320} /></div>
            <div className="card"><Skeleton height={18} width="50%" /><div style={{ height: 12 }} /><Skeleton height={260} /></div>
          </div>
        </>
      )}

      {data && rollup && (
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
                <dd className="mono tnum">{data.spans.length}</dd>
              </div>
              {rollup.services.length > 0 && (
                <div className="meta-item">
                  <dt>Services</dt>
                  <dd className="svc-list">
                    {rollup.services.map((s) => (
                      <span className="svc-chip" key={s}>
                        <span className="wf-dot" style={{ background: serviceColor(s) }} />
                        {s}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              {rollup.errorCount > 0 && (
                <div className="meta-item">
                  <dt>Errors</dt>
                  <dd className="mono tnum" style={{ color: "var(--block)" }}>{rollup.errorCount}</dd>
                </div>
              )}
              {rollup.hasTokens && (
                <div className="meta-item">
                  <dt>Tokens</dt>
                  <dd className="mono tnum">
                    {rollup.totalInputTokens} in · {rollup.totalOutputTokens} out
                  </dd>
                </div>
              )}
            </dl>

            {(rollup.worstEval || rollup.worstGuardrail) && (
              <div className="trace-chips">
                {rollup.worstEval && (
                  <Link href={`/requests/${data.request_id}`} className="chip-link" title="View eval results">
                    <VerdictBadge verdict={rollup.worstEval} />
                    <span className="chip-meta">{rollup.evalSpans} evaluated</span>
                    <ArrowRight size={13} />
                  </Link>
                )}
                {rollup.worstGuardrail && (
                  <Link href={`/requests/${data.request_id}`} className="chip-link" title="View guardrail decisions">
                    <GuardrailBadge decision={rollup.worstGuardrail} />
                    <span className="chip-meta">{rollup.guardrailSpans} gated</span>
                    <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="split">
            <div className="card">
              <div className="card-head">
                <h2>Span waterfall</h2>
                <span className="muted" style={{ fontSize: 12.5 }}>Select a span to inspect</span>
              </div>
              <TraceWaterfall trace={data} selectedId={selected?.span_id} onSelect={setSelected} />
            </div>
            {selected && <SpanInspector span={selected} requestId={data.request_id} />}
          </div>
        </>
      )}
    </Layout>
  );
}
