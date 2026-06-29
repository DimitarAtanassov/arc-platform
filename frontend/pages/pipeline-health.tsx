import Layout from "@/components/Layout";
import { Pipeline as PipelineIcon } from "@/components/icons";
import { EmptyState, Hint, Sparkline, StatCard, TableSkeleton } from "@/components/ui";
import { api, useAsync } from "@/lib/api";
import { formatLatency, formatRelative } from "@/lib/format";

export default function PipelineHealthPage() {
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([api.listRequests(200), api.listEvalRuns(200)]),
    [],
  );
  const [requests, runs] = data ?? [[], []];

  const latencies = requests.map((r) => r.latency_ms);
  const throughput = [...requests].reverse().map((r) => r.latency_ms);
  const lastSeen = requests[0]?.timestamp ?? runs[0]?.created_at ?? null;
  const pending = runs.filter((r) => r.verdict === "pending").length;
  const hasData = requests.length > 0 || runs.length > 0;

  return (
    <Layout
      section="Pipeline Health"
      title="Pipeline Health"
      subtitle="Ingestion and reconciliation status. The evaluator is the system of record; these figures reflect what it has accepted and scored."
      wide
      actions={<button className="btn" onClick={reload} disabled={loading}>Refresh</button>}
    >
      {error && <div className="alert alert--error">Failed to load pipeline health: {error}</div>}
      {loading && !data && <TableSkeleton rows={4} cols={4} />}

      {data && !hasData && (
        <EmptyState art={<PipelineIcon size={46} />} title="Pipeline is quiet">
          No interactions have been ingested yet. When the gateway forwards a request to the
          evaluator (online), or the collector ships spans for offline judging, throughput and
          reconciliation state will appear here.
        </EmptyState>
      )}

      {data && hasData && (
        <>
          <div className="grid grid-4">
            <StatCard
              label="Ingestion"
              hint="The evaluator is reachable and has served records to the console."
              value={<span style={{ color: "var(--pass)" }}>Healthy</span>}
              trend={{ dir: "flat", text: lastSeen ? `last ${formatRelative(lastSeen)}` : "—" }}
            />
            <StatCard label="Requests ingested" value={requests.length} hint="Distinct requests scored in the recent window." />
            <StatCard label="Eval runs" value={runs.length} hint="Evaluation runs produced from ingested interactions." />
            <StatCard
              label="In flight"
              hint="Runs submitted but not yet completed (async judging)."
              value={pending}
              trend={pending > 0 ? { dir: "down", text: "scoring" } : { dir: "flat", text: "idle" }}
            />
          </div>

          <div className="grid grid-2" style={{ marginTop: "var(--gap)" }}>
            <div className="card">
              <div className="card-head"><h2>Throughput</h2><span className="muted mono">last {throughput.length}</span></div>
              <Sparkline data={throughput.slice(-60)} width={520} height={120} stroke="var(--accent)" />
              <div className="row-between faint mono" style={{ fontSize: 12, marginTop: 4 }}>
                <span>min {formatLatency(Math.min(...latencies, 0))}</span>
                <span>max {formatLatency(Math.max(...latencies, 0))}</span>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h2>Reconciler <Hint>Online scoring runs inline on the hot path; offline ingestion reconciles spans shipped by the collector. Both feed the same store.</Hint></h2></div>
              <dl className="kv">
                <div className="kv-row"><dt>Online scoring</dt><dd><span className="badge badge--pass" style={{ fontFamily: "var(--font-sans)" }}>active</span></dd></div>
                <div className="kv-row"><dt>Offline ingest</dt><dd><span className="badge badge--neutral" style={{ fontFamily: "var(--font-sans)" }}>opt-in</span></dd></div>
                <div className="kv-row"><dt>Abandoned</dt><dd>0</dd></div>
                <div className="kv-row"><dt>Quiet period</dt><dd>{lastSeen ? formatRelative(lastSeen) : "—"}</dd></div>
              </dl>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
