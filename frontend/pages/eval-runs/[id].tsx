import Link from "next/link";
import { useRouter } from "next/router";

import Layout from "@/components/Layout";
import { ArrowLeft, ArrowRight, Diff } from "@/components/icons";
import { CopyId, Hint, Meter, ScoreDelta, Skeleton, VerdictBadge } from "@/components/ui";
import { api, useAsync } from "@/lib/api";
import { formatLatency, formatScore, formatTimestamp, shortId, VERDICT_LABEL } from "@/lib/format";
import type { EvalRunComparison, JudgeResult } from "@/lib/types";

export default function EvalRunDetailPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const { data, error } = useAsync(() => api.getEvalRun(id), [id]);

  return (
    <Layout section="Eval Runs" title={id ? shortId(id, 16) : "Run"} wide>
      <Link href="/eval-runs" className="back-link"><ArrowLeft size={15} /> All runs</Link>

      {error && <div className="alert alert--error">Failed to load run: {error}</div>}
      {!error && !data && (
        <div className="card"><Skeleton height={20} width="50%" /><div style={{ height: 12 }} /><Skeleton height={120} /></div>
      )}

      {data && (
        <>
          <section className="card" style={{ marginBottom: "var(--gap)" }}>
            <div className="row-between" style={{ alignItems: "flex-start" }}>
              <div className="inline" style={{ gap: 16, alignItems: "center" }}>
                <VerdictBadge verdict={data.verdict} />
                <div>
                  <div className="score-big">{formatScore(data.aggregate_score)}</div>
                  <div className="faint" style={{ fontSize: 12 }}>aggregate score</div>
                </div>
              </div>
              <dl className="meta-grid" style={{ flex: 1, marginLeft: 28 }}>
                <div className="meta-item">
                  <dt>Request</dt>
                  <dd><Link href={`/requests/${data.request_id}`} className="link inline">{shortId(data.request_id, 14)} <ArrowRight size={13} /></Link></dd>
                </div>
                <div className="meta-item">
                  <dt>Trace</dt>
                  <dd>{data.trace_id ? <Link href={`/traces/${data.trace_id}`} className="link">{shortId(data.trace_id, 12)}</Link> : <span className="faint">—</span>}</dd>
                </div>
                <div className="meta-item">
                  <dt>Model</dt>
                  <dd>{data.model ?? "—"}</dd>
                </div>
                <div className="meta-item">
                  <dt>Mode</dt>
                  <dd className="mono">{data.mode}</dd>
                </div>
                <div className="meta-item">
                  <dt>Created</dt>
                  <dd>{formatTimestamp(data.created_at)}</dd>
                </div>
                <div className="meta-item">
                  <dt>Run ID</dt>
                  <dd><CopyId value={data.evaluation_id} display={shortId(data.evaluation_id, 12)} /></dd>
                </div>
              </dl>
            </div>
          </section>

          {data.compare_to && <DiffSection current={data.results} previous={data.compare_to} />}

          <section className="card" style={{ marginBottom: "var(--gap)" }}>
            <div className="card-head"><h2>Judge verdicts</h2><span className="muted mono">{data.results.length}</span></div>
            <div className="stack" style={{ gap: 14 }}>
              {data.results.map((r, i) => <JudgeResultRow key={`${r.judge}-${i}`} result={r} />)}
            </div>
          </section>

          <section className="card">
            <span className="payload-label">Input</span>
            <pre className="payload">{data.input || "—"}</pre>
            <span className="payload-label">Output</span>
            <pre className="payload">{data.output || "—"}</pre>
          </section>
        </>
      )}
    </Layout>
  );
}

function JudgeResultRow({ result }: { result: JudgeResult }) {
  const verdict = result.error ? "block" : result.passed ? "pass" : "degrade";
  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: 14 }}>
      <div className="row-between">
        <span className="inline">
          <span className="mono" style={{ fontSize: 13.5, fontWeight: 600 }}>{result.judge}</span>
          {result.label && <span className="tag">{result.label}</span>}
          {result.model && <span className="faint" style={{ fontSize: 12 }}>{result.model}</span>}
        </span>
        <span className="inline">
          <span style={{ width: 120, display: "inline-block" }}><Meter value={result.score} verdict={verdict} /></span>
          <span className="mono" style={{ minWidth: 48, textAlign: "right" }}>{formatScore(result.score)}</span>
          <span className="faint mono" style={{ fontSize: 11.5, minWidth: 56, textAlign: "right" }}>{formatLatency(result.latency_ms)}</span>
        </span>
      </div>
      {result.error ? (
        <div className="alert alert--error" style={{ marginTop: 8 }}>{result.error}</div>
      ) : (
        result.explanation && <p className="muted" style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.55 }}>{result.explanation}</p>
      )}
    </div>
  );
}

function DiffSection({ current, previous }: { current: JudgeResult[]; previous: EvalRunComparison }) {
  // Align judges by name across the two runs.
  const prevByJudge = new Map(previous.results.map((r) => [r.judge, r]));
  const judges = [...new Set([...current.map((r) => r.judge), ...previous.results.map((r) => r.judge)])];
  const curByJudge = new Map(current.map((r) => [r.judge, r]));

  return (
    <section className="card" style={{ marginBottom: "var(--gap)" }}>
      <div className="card-head">
        <h2 className="inline"><Diff size={16} /> Run-to-run diff <Hint>Compared against the most recent prior run of the same request. Use this to spot regressions between runs.</Hint></h2>
        <Link href={`/eval-runs/${previous.evaluation_id}`} className="link mono" style={{ fontSize: 12 }}>
          vs {shortId(previous.evaluation_id, 12)}
        </Link>
      </div>
      <div className="diff-row" style={{ borderBottom: "1px solid var(--border)", paddingTop: 0 }}>
        <span className="faint" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Previous · <VerdictLabelInline v={previous.verdict} /> · {formatScore(previous.aggregate_score)}
        </span>
        <span className="faint" style={{ textAlign: "center", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Δ</span>
        <span className="faint diff-side--right" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Current</span>
      </div>
      {judges.map((j) => {
        const prev = prevByJudge.get(j) ?? null;
        const cur = curByJudge.get(j) ?? null;
        return (
          <div className="diff-row" key={j}>
            <span className="diff-side">
              <span className="mono">{j}</span>
              <span className="mono faint">{prev ? formatScore(prev.score) : "—"}</span>
            </span>
            <ScoreDelta from={prev?.score ?? null} to={cur?.score ?? null} />
            <span className="diff-side diff-side--right">
              <span className="mono">{cur ? formatScore(cur.score) : "—"}</span>
              {cur && (
                <span style={{ width: 90, display: "inline-block" }}>
                  <Meter value={cur.score} verdict={cur.passed ? "pass" : "degrade"} />
                </span>
              )}
            </span>
          </div>
        );
      })}
    </section>
  );
}

function VerdictLabelInline({ v }: { v: EvalRunComparison["verdict"] }) {
  return <span>{VERDICT_LABEL[v]}</span>;
}
