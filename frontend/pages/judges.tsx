import Layout from "@/components/Layout";
import { Judges as JudgesIcon } from "@/components/icons";
import { EmptyState, Hint, Meter, Skeleton } from "@/components/ui";
import { api, useAsync } from "@/lib/api";
import { formatPercent, formatScore } from "@/lib/format";
import type { MetricSummary } from "@/lib/types";

export default function JudgesPage() {
  const { data, error } = useAsync(
    () => Promise.all([api.listJudges(), api.getEvaluationSummary()]),
    [],
  );
  const [judges, summary] = data ?? [[], { total_evaluations: 0, metrics: [] }];
  const metricByName = new Map<string, MetricSummary>(summary.metrics.map((m) => [m.metric, m]));

  return (
    <Layout
      section="Judges"
      title="Judges"
      subtitle="LLM-as-judge rubrics registered on the evaluator. Each judge declares the inputs it requires and emits a PASS/BLOCK verdict per run."
    >
      {error && <div className="alert alert--error">Failed to load judges: {error}</div>}
      {!data && (
        <div className="grid grid-2">
          <div className="card"><Skeleton height={18} width="40%" /><div style={{ height: 12 }} /><Skeleton height={48} /></div>
          <div className="card"><Skeleton height={18} width="40%" /><div style={{ height: 12 }} /><Skeleton height={48} /></div>
        </div>
      )}

      {data && judges.length === 0 && (
        <EmptyState art={<JudgesIcon size={46} />} title="No judges registered">
          The evaluator exposes its judge registry at <span className="mono">/v1/judges</span>. None
          are reporting yet — configure at least one judge-model profile
          (<span className="mono">ARC_EVAL_MODEL_PROFILES</span>) on the evaluator, then judges
          become available for online and offline scoring.
        </EmptyState>
      )}

      {data && judges.length > 0 && (
        <div className="grid grid-2">
          {judges.map((j) => {
            const m = metricByName.get(j.name);
            return (
              <div className="card" key={j.name}>
                <div className="card-head">
                  <h2>{j.name}</h2>
                  {m && (
                    <span className={`badge ${m.pass_rate >= 0.85 ? "badge--pass" : m.pass_rate > 0 ? "badge--degrade" : "badge--block"}`}>
                      {formatPercent(m.pass_rate, 0)} pass
                    </span>
                  )}
                </div>
                <p className="muted" style={{ marginTop: -6, fontSize: 13.5, lineHeight: 1.55 }}>{j.description || "No description provided."}</p>

                <div className="payload-label">Requires</div>
                <div className="inline" style={{ flexWrap: "wrap", gap: 6 }}>
                  {j.requires.length ? j.requires.map((r) => <span className="tag" key={r}>{r}</span>) : <span className="faint">nothing</span>}
                </div>

                <hr className="divider" />

                {m ? (
                  <>
                    <div className="row-between" style={{ marginBottom: 8 }}>
                      <span className="muted" style={{ fontSize: 12.5 }}>Verdict breakdown <Hint>Pass rate and average score for this judge across the recent evaluation window.</Hint></span>
                      <span className="mono faint">{m.passed}/{m.total} passed</span>
                    </div>
                    <Meter value={m.pass_rate} verdict={m.pass_rate >= 0.85 ? "pass" : "degrade"} />
                    <div className="row-between faint mono" style={{ fontSize: 12, marginTop: 8 }}>
                      <span>avg score {formatScore(m.average_score)}</span>
                      <span>{m.total} runs</span>
                    </div>
                  </>
                ) : (
                  <p className="faint" style={{ margin: 0, fontSize: 13 }}>No runs scored by this judge in the recent window yet.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
