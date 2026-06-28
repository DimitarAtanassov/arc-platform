import Layout from "@/components/Layout";
import { api, useAsync } from "@/lib/api";
import { formatPercent } from "@/lib/format";

export default function EvaluationsPage() {
  const { data, error, loading } = useAsync(() => api.getEvaluationSummary(), []);

  return (
    <Layout
      title="Evaluations"
      subtitle="Placeholder evaluation metrics aggregated across requests."
    >
      {error && <div className="error">Failed to load evaluations: {error}</div>}
      {!error && loading && <div className="empty">Loading…</div>}

      {data && (
        <>
          <div className="stat-strip">
            <div className="stat">
              <span className="stat-value">{data.total_evaluations}</span>
              <span className="stat-label">total evaluations</span>
            </div>
            <div className="stat">
              <span className="stat-value">{data.metrics.length}</span>
              <span className="stat-label">metrics tracked</span>
            </div>
          </div>

          <div className="eval-grid">
            {data.metrics.map((metric) => (
              <div className="eval-card" key={metric.metric}>
                <div className="eval-card-head">
                  <h3>{metric.metric}</h3>
                  <span className="muted">{metric.total} runs</span>
                </div>
                <div className="eval-score">{formatPercent(metric.pass_rate)}</div>
                <div className="eval-sub">pass rate</div>
                <div className="meter">
                  <div
                    className="meter-fill"
                    style={{ width: `${metric.pass_rate * 100}%` }}
                  />
                </div>
                <div className="eval-foot">
                  avg score {metric.average_score.toFixed(3)} · {metric.passed}/
                  {metric.total} passed
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}
