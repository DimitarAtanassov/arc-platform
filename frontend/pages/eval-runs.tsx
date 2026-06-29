import { useRouter } from "next/router";
import { useMemo, useState } from "react";

import Layout from "@/components/Layout";
import { ArrowRight, Runs as RunsIcon, Search } from "@/components/icons";
import { EmptyState, Meter, TableSkeleton, VerdictBadge } from "@/components/ui";
import { api, useAsync } from "@/lib/api";
import { formatRelative, formatScore, shortId } from "@/lib/format";
import type { Verdict } from "@/lib/types";

const FILTERS: Array<{ key: "all" | Verdict; label: string }> = [
  { key: "all", label: "All" },
  { key: "pass", label: "Pass" },
  { key: "degrade", label: "Degrade" },
  { key: "block", label: "Block" },
];

export default function EvalRunsPage() {
  const router = useRouter();
  const { data, error, loading, reload } = useAsync(() => api.listEvalRuns(200), []);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Verdict>("all");

  const rows = useMemo(() => {
    const all = data ?? [];
    const needle = q.trim().toLowerCase();
    return all.filter((r) => {
      if (filter !== "all" && r.verdict !== filter) return false;
      if (!needle) return true;
      return (
        r.request_id.toLowerCase().includes(needle) ||
        r.evaluation_id.toLowerCase().includes(needle) ||
        r.judges.some((j) => j.toLowerCase().includes(needle))
      );
    });
  }, [data, q, filter]);

  return (
    <Layout
      section="Eval Runs"
      title="Eval Runs"
      subtitle="LLM-as-judge results, newest first. Open a run to read verdicts and diff it against the prior run of the same request."
      wide
      actions={<button className="btn" onClick={reload} disabled={loading}>Refresh</button>}
    >
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Verdict filter">
          {FILTERS.map((f) => (
            <button key={f.key} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="search-wrap">
          <Search size={15} />
          <input className="input input--search" placeholder="Filter by request, run, or judge…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 300 }} />
        </span>
        <div className="toolbar-spacer" />
        {data && <span className="muted mono">{rows.length} / {data.length}</span>}
      </div>

      {error && <div className="alert alert--error">Failed to load eval runs: {error}</div>}
      {loading && !data && <TableSkeleton rows={8} cols={6} />}

      {data && data.length === 0 && (
        <EmptyState art={<RunsIcon size={46} />} title="No eval runs yet">
          Each request scored by the evaluator becomes a run here, with a PASS / DEGRADE / BLOCK
          verdict and per-judge scores. Configure a judge model on the evaluator and drive a
          request through the gateway to see your first run.
        </EmptyState>
      )}

      {data && data.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Verdict</th>
                <th>Request</th>
                <th>Judges</th>
                <th style={{ width: 160 }}>Score</th>
                <th>Model</th>
                <th className="num">Age</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.evaluation_id} className="row-clickable" onClick={() => router.push(`/eval-runs/${r.evaluation_id}`)}>
                  <td><VerdictBadge verdict={r.verdict} /></td>
                  <td className="td-mono">{shortId(r.request_id, 16)}</td>
                  <td>
                    <span className="inline" style={{ flexWrap: "wrap", gap: 5 }}>
                      {r.judges.slice(0, 3).map((j, i) => <span className="tag" key={`${j}-${i}`}>{j}</span>)}
                      {r.judges.length > 3 && <span className="faint mono">+{r.judges.length - 3}</span>}
                    </span>
                  </td>
                  <td>
                    <span className="inline">
                      <span style={{ width: 90, display: "inline-block" }}><Meter value={r.aggregate_score ?? 0} verdict={r.verdict} /></span>
                      <span className="mono faint">{formatScore(r.aggregate_score)}</span>
                    </span>
                  </td>
                  <td className="faint">{r.model ?? "—"}</td>
                  <td className="num faint">{formatRelative(r.created_at)}</td>
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
