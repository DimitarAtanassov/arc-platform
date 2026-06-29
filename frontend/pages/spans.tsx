import { useRouter } from "next/router";
import { useMemo, useState } from "react";

import Layout from "@/components/Layout";
import { ArrowRight, Search, Spans as SpansIcon } from "@/components/icons";
import { EmptyState, Hint, Meter, TableSkeleton } from "@/components/ui";
import { api, useAsync } from "@/lib/api";
import { formatLatency, shortId } from "@/lib/format";
import type { Span, Trace } from "@/lib/types";

const WINDOW = 40; // recent traces to scan

function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

interface FlatSpan extends Span {
  trace_id: string;
}

export default function SpansPage() {
  const { data, error, loading } = useAsync(async () => {
    const requests = await api.listRequests(WINDOW);
    const seen = new Set<string>();
    const traceIds = requests.map((r) => r.trace_id).filter((t) => t && !seen.has(t) && seen.add(t));
    const traces = await Promise.all(
      traceIds.map((t) => api.getTrace(t).catch(() => null)),
    );
    return traces.filter((t): t is Trace => t !== null);
  }, []);

  const [q, setQ] = useState("");

  const flat = useMemo<FlatSpan[]>(() => {
    const out: FlatSpan[] = [];
    for (const t of data ?? []) for (const s of t.spans) out.push({ ...s, trace_id: t.trace_id });
    return out;
  }, [data]);

  const types = useMemo(() => {
    const groups = new Map<string, number[]>();
    for (const s of flat) {
      const b = groups.get(s.name) ?? [];
      b.push(s.duration_ms);
      groups.set(s.name, b);
    }
    const maxP95 = Math.max(1, ...[...groups.values()].map((d) => percentile(d, 95)));
    return [...groups.entries()]
      .map(([name, ds]) => ({
        name,
        count: ds.length,
        p50: percentile(ds, 50),
        p95: percentile(ds, 95),
        share: percentile(ds, 95) / maxP95,
      }))
      .sort((a, b) => b.p95 - a.p95);
  }, [flat]);

  const filteredFlat = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = needle ? flat.filter((s) => s.name.toLowerCase().includes(needle)) : flat;
    return rows.slice(0, 120);
  }, [flat, q]);

  return (
    <Layout
      section="Spans"
      title="Spans"
      subtitle="Span timings aggregated across recent traces — find the slowest operation in the pipeline."
      wide
    >
      {error && <div className="alert alert--error">Failed to load spans: {error}</div>}
      {loading && !data && <TableSkeleton rows={6} cols={4} />}

      {data && flat.length === 0 && (
        <EmptyState art={<SpansIcon size={46} />} title="No spans yet">
          Spans are reconstructed from each scored request — a gateway root, the provider call, and
          a span per judge. Drive a request through the gateway and its spans will appear here and
          in the trace explorer.
        </EmptyState>
      )}

      {data && flat.length > 0 && (
        <>
          <div className="card" style={{ marginBottom: "var(--gap)" }}>
            <div className="card-head">
              <h2>Span types</h2>
              <span className="muted mono">{types.length} types · {flat.length} spans · {data.length} traces</span>
            </div>
            <div className="table-wrap" style={{ border: "none" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Span</th>
                    <th className="num">Count</th>
                    <th className="num">p50</th>
                    <th className="num">p95</th>
                    <th style={{ width: 180 }}>p95 share</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((t) => (
                    <tr key={t.name}>
                      <td className="mono">{t.name}</td>
                      <td className="num mono">{t.count}</td>
                      <td className="num mono">{formatLatency(t.p50)}</td>
                      <td className="num mono">{formatLatency(t.p95)}</td>
                      <td><Meter value={t.share} verdict={t.share > 0.8 ? "degrade" : "pass"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Recent spans <Hint>A flat view of individual spans across the most recent traces. Open any to inspect it in its trace.</Hint></h2>
              <span className="search-wrap">
                <Search size={15} />
                <input className="input input--search" placeholder="Filter by span name…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 260 }} />
              </span>
            </div>
            <SpanList rows={filteredFlat} />
          </div>
        </>
      )}
    </Layout>
  );
}

function SpanList({ rows }: { rows: FlatSpan[] }) {
  const router = useRouter();
  return (
    <div className="table-wrap" style={{ border: "none" }}>
      <table className="table">
        <thead>
          <tr>
            <th>Span</th>
            <th className="num">Duration</th>
            <th className="num">Offset</th>
            <th>Trace</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={`${s.trace_id}:${s.span_id}`} className="row-clickable" onClick={() => router.push(`/traces/${s.trace_id}`)}>
              <td className="mono">{s.name}</td>
              <td className="num mono">{formatLatency(s.duration_ms)}</td>
              <td className="num mono faint">{formatLatency(s.start_offset_ms)}</td>
              <td className="td-mono">{shortId(s.trace_id, 12)}</td>
              <td className="num"><ArrowRight size={15} className="row-arrow" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
