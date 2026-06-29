import Link from "next/link";
import { useRouter } from "next/router";

import Layout from "@/components/Layout";
import TraceWaterfall from "@/components/TraceWaterfall";
import { ArrowLeft, ArrowRight } from "@/components/icons";
import { CopyId, Skeleton, StatusBadge, VerdictBadge } from "@/components/ui";
import { api, useAsync } from "@/lib/api";
import { formatLatency, formatTimestamp, shortId } from "@/lib/format";

export default function RequestDetailPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";

  const request = useAsync(() => api.getRequest(id), [id]);
  const detail = request.data;
  const trace = useAsync(
    () => (detail ? api.getTrace(detail.trace_id) : Promise.reject(new Error("no trace"))),
    [detail?.trace_id],
  );
  const runs = useAsync(() => api.listEvalRuns(200), []);
  const run = runs.data?.find((r) => r.request_id === id) ?? null;

  return (
    <Layout section="Traces" title={id ? shortId(id, 16) : "Request"}>
      <Link href="/traces" className="back-link"><ArrowLeft size={15} /> All traces</Link>

      {request.error && <div className="alert alert--error">Failed to load request: {request.error}</div>}
      {!request.error && !detail && (
        <div className="card"><Skeleton height={18} width="40%" /><div style={{ height: 12 }} /><Skeleton height={120} /></div>
      )}

      {detail && (
        <>
          <section className="card">
            <dl className="meta-grid">
              <div className="meta-item">
                <dt>Status</dt>
                <dd><StatusBadge status={detail.status} /></dd>
              </div>
              {run && (
                <div className="meta-item">
                  <dt>Verdict</dt>
                  <dd>
                    <Link href={`/eval-runs/${run.evaluation_id}`} className="inline">
                      <VerdictBadge verdict={run.verdict} />
                    </Link>
                  </dd>
                </div>
              )}
              <div className="meta-item">
                <dt>Model</dt>
                <dd>{detail.model_name}</dd>
              </div>
              <div className="meta-item">
                <dt>Latency</dt>
                <dd className="mono">{formatLatency(detail.latency_ms)}</dd>
              </div>
              <div className="meta-item">
                <dt>Tokens</dt>
                <dd className="mono">{detail.prompt_tokens} → {detail.completion_tokens}</dd>
              </div>
              <div className="meta-item">
                <dt>Timestamp</dt>
                <dd>{formatTimestamp(detail.timestamp)}</dd>
              </div>
              <div className="meta-item">
                <dt>Request ID</dt>
                <dd><CopyId value={detail.request_id} display={shortId(detail.request_id, 14)} /></dd>
              </div>
              <div className="meta-item">
                <dt>Trace ID</dt>
                <dd><CopyId value={detail.trace_id} display={shortId(detail.trace_id, 14)} /></dd>
              </div>
            </dl>
          </section>

          <section className="card">
            <span className="payload-label">Prompt</span>
            <pre className="payload">{detail.prompt || "—"}</pre>
            <span className="payload-label">Response</span>
            <pre className="payload">{detail.response || "—"}</pre>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Trace</h2>
              <Link href={`/traces/${detail.trace_id}`} className="link inline">
                Open in trace explorer <ArrowRight size={14} />
              </Link>
            </div>
            {trace.error && <div className="alert alert--error">Failed to load trace: {trace.error}</div>}
            {trace.data ? <TraceWaterfall trace={trace.data} /> : !trace.error && <Skeleton height={120} />}
          </section>
        </>
      )}
    </Layout>
  );
}
