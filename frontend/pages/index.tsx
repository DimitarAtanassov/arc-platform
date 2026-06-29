import Link from "next/link";

import Layout from "@/components/Layout";
import { Astrolabe, ArrowRight, Pipeline } from "@/components/icons";
import {
  EmptyState,
  Hint,
  Meter,
  Sparkline,
  StatCard,
  TableSkeleton,
  VerdictBadge,
} from "@/components/ui";
import { api, useAsync } from "@/lib/api";
import { formatLatency, formatPercent, formatRelative, shortId } from "@/lib/format";
import type { EvalRunSummary, Verdict } from "@/lib/types";

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

const VERDICT_VAR: Record<Verdict, string> = {
  pass: "var(--pass)",
  degrade: "var(--degrade)",
  block: "var(--block)",
  pending: "var(--text-faint)",
};

export default function DashboardPage() {
  const { data, error, loading, reload } = useAsync(
    () =>
      Promise.all([
        api.listRequests(100),
        api.listEvalRuns(100),
        api.getEvaluationSummary(),
      ]),
    [],
  );

  const [requests, runs, summary] = data ?? [[], [], { total_evaluations: 0, metrics: [] }];

  const latencies = requests.map((r) => r.latency_ms);
  const models = new Set(requests.map((r) => r.model_name));

  const completed = runs.filter((r) => r.verdict !== "pending");
  const counts: Record<Verdict, number> = { pass: 0, degrade: 0, block: 0, pending: 0 };
  for (const r of runs) counts[r.verdict] += 1;
  const passRate = completed.length ? counts.pass / completed.length : 0;

  // Latency over the recent window (oldest → newest) for the trend sparkline.
  const latencyTrend = [...requests].reverse().map((r) => r.latency_ms);
  const attention = runs.filter((r) => r.verdict === "block" || r.verdict === "degrade").slice(0, 6);

  const hasData = requests.length > 0 || runs.length > 0;

  return (
    <Layout
      title="Dashboard"
      subtitle="Health of evaluation and ingestion across the control plane — calm at a glance, dense on demand."
      actions={
        <button className="btn" onClick={reload} disabled={loading}>
          Refresh
        </button>
      }
    >
      {error && <div className="alert alert--error">Failed to load dashboard: {error}</div>}
      {loading && !data && <TableSkeleton rows={4} cols={4} />}

      {data && !hasData && (
        <EmptyState
          art={<Astrolabe size={48} />}
          title="No telemetry yet"
          actions={
            <Link href="/eval-runs" className="btn">View Eval Runs</Link>
          }
        >
          The console reads live from the evaluator, which has no scored interactions yet.
          Drive a request through the gateway (<span className="mono">POST /v1/infer</span>) — it
          scores online and the result will surface here, in Traces, and in Eval Runs.
        </EmptyState>
      )}

      {data && hasData && (
        <>
          <div className="grid grid-4">
            <StatCard
              label="Pass rate"
              hint="Share of completed eval runs with a clean PASS verdict (not degraded or blocked)."
              value={formatPercent(passRate, 0)}
              spark={completed.slice(0, 24).reverse().map((r) => (r.verdict === "pass" ? 1 : 0))}
              sparkStroke="var(--pass)"
            />
            <StatCard
              label="Median latency"
              hint="p50 of request latency over the recent window. p95 shown below."
              value={formatLatency(median(latencies))}
              trend={{ dir: "flat", text: `p95 ${formatLatency(percentile(latencies, 95))}` }}
              spark={latencyTrend.slice(-24)}
              sparkStroke="var(--info)"
            />
            <StatCard
              label="Eval runs"
              hint="Total evaluation runs in the recent window."
              value={runs.length}
              trend={{ dir: "flat", text: `${summary.metrics.length} judges active` }}
            />
            <StatCard
              label="Block rate"
              hint="Share of completed runs blocked by a judge — the headline regression signal."
              value={formatPercent(completed.length ? counts.block / completed.length : 0, 0)}
              trend={{ dir: completed.length && counts.block === 0 ? "flat" : "down", text: `${models.size} models` }}
              spark={completed.slice(0, 24).reverse().map((r) => (r.verdict === "block" ? 1 : 0))}
              sparkStroke="var(--block)"
            />
          </div>

          <div className="grid grid-2" style={{ marginTop: "var(--gap)" }}>
            <div className="card">
              <div className="card-head">
                <h2>Verdict mix</h2>
                <span className="muted mono">{completed.length} completed</span>
              </div>
              <VerdictBar counts={counts} />
              <div className="stack" style={{ marginTop: 16 }}>
                {(["pass", "degrade", "block"] as Verdict[]).map((v) => (
                  <div className="row-between" key={v}>
                    <span className="inline">
                      <VerdictBadge verdict={v} />
                    </span>
                    <span className="mono">
                      {counts[v]}{" "}
                      <span className="faint">
                        ({formatPercent(completed.length ? counts[v] / completed.length : 0, 0)})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h2>Latency trend</h2>
                <span className="muted mono">last {latencyTrend.length}</span>
              </div>
              <div style={{ padding: "8px 0" }}>
                <Sparkline data={latencyTrend.slice(-60)} width={520} height={120} stroke="var(--info)" />
              </div>
              <div className="row-between faint mono" style={{ fontSize: 12 }}>
                <span>min {formatLatency(Math.min(...latencies, 0))}</span>
                <span>p50 {formatLatency(median(latencies))}</span>
                <span>p95 {formatLatency(percentile(latencies, 95))}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-2" style={{ marginTop: "var(--gap)" }}>
            <div className="card">
              <div className="card-head">
                <h2>Needs attention</h2>
                <Hint>Recent runs that degraded or were blocked by a judge — the first place to look for regressions.</Hint>
              </div>
              {attention.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>No degraded or blocked runs in the recent window. Clear skies.</p>
              ) : (
                <div className="stack">
                  {attention.map((r) => (
                    <AttentionRow key={r.evaluation_id} run={r} />
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-head">
                <h2>Pipeline ingestion</h2>
                <Hint>The evaluator is the system of record. These figures reflect what it has scored and served back to the console.</Hint>
              </div>
              <div className="inline" style={{ gap: 12, marginBottom: 14 }}>
                <span className="badge badge--pass"><Pipeline size={13} /> Ingesting</span>
                <span className="muted">evaluator reachable · {runs.length} records</span>
              </div>
              <dl className="meta-grid">
                <div className="meta-item">
                  <dt>Requests</dt>
                  <dd className="mono">{requests.length}</dd>
                </div>
                <div className="meta-item">
                  <dt>Eval runs</dt>
                  <dd className="mono">{runs.length}</dd>
                </div>
                <div className="meta-item">
                  <dt>Judges active</dt>
                  <dd className="mono">{summary.metrics.length}</dd>
                </div>
                <div className="meta-item">
                  <dt>Total evaluations</dt>
                  <dd className="mono">{summary.total_evaluations}</dd>
                </div>
              </dl>
              <Link href="/pipeline-health" className="link inline" style={{ marginTop: 14 }}>
                Pipeline Health <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

function VerdictBar({ counts }: { counts: Record<Verdict, number> }) {
  const total = counts.pass + counts.degrade + counts.block || 1;
  const seg = (v: Verdict) => `${(counts[v] / total) * 100}%`;
  return (
    <div style={{ display: "flex", height: 14, borderRadius: 999, overflow: "hidden", background: "var(--surface-4)" }}>
      {(["pass", "degrade", "block"] as Verdict[]).map((v) =>
        counts[v] > 0 ? (
          <div key={v} style={{ width: seg(v), background: VERDICT_VAR[v] }} title={`${v}: ${counts[v]}`} />
        ) : null,
      )}
    </div>
  );
}

function AttentionRow({ run }: { run: EvalRunSummary }) {
  return (
    <Link href={`/eval-runs/${run.evaluation_id}`} className="row-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <span className="inline">
        <VerdictBadge verdict={run.verdict} />
        <span className="mono faint">{shortId(run.request_id, 14)}</span>
      </span>
      <span className="inline">
        <span style={{ width: 110, display: "inline-block" }}>
          <Meter value={run.aggregate_score ?? 0} verdict={run.verdict} />
        </span>
        <span className="faint" style={{ fontSize: 12, minWidth: 64, textAlign: "right" }}>{formatRelative(run.created_at)}</span>
      </span>
    </Link>
  );
}
