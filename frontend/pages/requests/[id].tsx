import Link from "next/link";
import { useRouter } from "next/router";

import Layout from "@/components/Layout";
import MetaGrid from "@/components/MetaGrid";
import StatusBadge from "@/components/StatusBadge";
import TraceWaterfall from "@/components/TraceWaterfall";
import { api, useAsync } from "@/lib/api";
import { formatLatency, formatTimestamp } from "@/lib/format";

export default function RequestDetailPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";

  const request = useAsync(() => api.getRequest(id), [id]);
  const detail = request.data;
  const trace = useAsync(
    () => (detail ? api.getTrace(detail.trace_id) : Promise.reject(new Error("no trace"))),
    [detail?.trace_id],
  );

  if (!id) return <Layout title="Request">…</Layout>;

  return (
    <Layout title="Request detail" subtitle={id}>
      <Link href="/" className="back-link">
        ← Back to requests
      </Link>

      {request.error && <div className="error">Failed to load request: {request.error}</div>}
      {!request.error && !detail && <div className="empty">Loading…</div>}

      {detail && (
        <>
          <section className="card">
            <MetaGrid
              items={[
                { label: "Status", value: <StatusBadge status={detail.status} /> },
                { label: "Model", value: detail.model_name },
                { label: "Latency", value: formatLatency(detail.latency_ms) },
                { label: "Timestamp", value: formatTimestamp(detail.timestamp) },
                { label: "Prompt tokens", value: detail.prompt_tokens },
                { label: "Completion tokens", value: detail.completion_tokens },
                { label: "Trace", value: detail.trace_id, mono: true },
              ]}
            />
          </section>

          <section className="card">
            <h2>Prompt</h2>
            <pre className="payload">{detail.prompt}</pre>
            <h2>Response</h2>
            <pre className="payload">{detail.response}</pre>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Trace</h2>
              <Link href={`/traces/${detail.trace_id}`} className="link">
                Open in Trace Explorer →
              </Link>
            </div>
            {trace.error && <div className="error">Failed to load trace: {trace.error}</div>}
            {trace.data ? (
              <TraceWaterfall trace={trace.data} />
            ) : (
              !trace.error && <div className="empty">Loading trace…</div>
            )}
          </section>
        </>
      )}
    </Layout>
  );
}
