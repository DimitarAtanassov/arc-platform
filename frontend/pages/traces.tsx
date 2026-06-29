import { useRouter } from "next/router";
import { useMemo, useState } from "react";

import Layout from "@/components/Layout";
import { ArrowRight, Search, Traces as TracesIcon } from "@/components/icons";
import { CopyId, EmptyState, StatusBadge, TableSkeleton } from "@/components/ui";
import { api, useAsync } from "@/lib/api";
import { formatLatency, formatRelative, shortId } from "@/lib/format";
import type { RequestStatus } from "@/lib/types";

export default function TracesPage() {
  const router = useRouter();
  const { data, error, loading, reload } = useAsync(() => api.listRequests(200), []);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | RequestStatus>("all");

  const rows = useMemo(() => {
    const all = data ?? [];
    const needle = q.trim().toLowerCase();
    return all.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!needle) return true;
      return (
        r.request_id.toLowerCase().includes(needle) ||
        r.trace_id.toLowerCase().includes(needle) ||
        r.model_name.toLowerCase().includes(needle)
      );
    });
  }, [data, q, status]);

  return (
    <Layout
      section="Traces"
      title="Traces"
      subtitle="Every request reconstructed into a span waterfall. Filter, then open a trace to inspect spans."
      wide
      actions={
        <button className="btn" onClick={reload} disabled={loading}>
          Refresh
        </button>
      }
    >
      <div className="toolbar">
        <span className="search-wrap">
          <Search size={15} />
          <input
            className="input input--search"
            placeholder="Filter by trace, request, or model…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 320 }}
          />
        </span>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">All statuses</option>
          <option value="ok">OK</option>
          <option value="error">Error</option>
        </select>
        <div className="toolbar-spacer" />
        {data && <span className="muted mono">{rows.length} / {data.length}</span>}
      </div>

      {error && <div className="alert alert--error">Failed to load traces: {error}</div>}
      {loading && !data && <TableSkeleton rows={8} cols={6} />}

      {data && data.length === 0 && (
        <EmptyState
          art={<TracesIcon size={46} />}
          title="No traces yet"
        >
          A trace is reconstructed for every scored request. Once a request flows through the
          gateway and the evaluator scores it, its waterfall — gateway root, provider call, and a
          span per judge — will appear here.
        </EmptyState>
      )}

      {data && data.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Trace</th>
                <th>Request</th>
                <th>Model</th>
                <th>Status</th>
                <th className="num">Latency</th>
                <th className="num">Age</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.request_id} className="row-clickable" onClick={() => router.push(`/traces/${r.trace_id}`)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <CopyId value={r.trace_id} display={shortId(r.trace_id, 14)} />
                  </td>
                  <td className="td-mono">{shortId(r.request_id, 16)}</td>
                  <td>{r.model_name}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="num mono">{formatLatency(r.latency_ms)}</td>
                  <td className="num faint">{formatRelative(r.timestamp)}</td>
                  <td className="num"><ArrowRight size={15} className="row-arrow" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
