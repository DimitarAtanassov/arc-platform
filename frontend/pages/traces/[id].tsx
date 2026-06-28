import Link from "next/link";
import { useRouter } from "next/router";

import Layout from "@/components/Layout";
import MetaGrid from "@/components/MetaGrid";
import TraceWaterfall from "@/components/TraceWaterfall";
import { api, useAsync } from "@/lib/api";
import { formatLatency } from "@/lib/format";

export default function TraceExplorerPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const { data, error } = useAsync(() => api.getTrace(id), [id]);

  if (!id) return <Layout title="Trace Explorer">…</Layout>;

  return (
    <Layout title="Trace Explorer" subtitle={id}>
      {data && (
        <Link href={`/requests/${data.request_id}`} className="back-link">
          ← Back to request
        </Link>
      )}

      {error && <div className="error">Failed to load trace: {error}</div>}
      {!error && !data && <div className="empty">Loading…</div>}

      {data && (
        <>
          <section className="card">
            <MetaGrid
              items={[
                { label: "Trace ID", value: data.trace_id, mono: true },
                { label: "Request ID", value: data.request_id, mono: true },
                { label: "Duration", value: formatLatency(data.duration_ms) },
                { label: "Spans", value: data.spans.length },
              ]}
            />
          </section>
          <section className="card">
            <h2>Span waterfall</h2>
            <TraceWaterfall trace={data} />
          </section>
        </>
      )}
    </Layout>
  );
}
