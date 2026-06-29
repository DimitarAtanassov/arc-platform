/*
 * Span detail panel — the selected span's complete record, nothing repeated.
 *
 * Single source of truth: trace facts live in the trace header, span facts live
 * here. Groups are collapsible and self-hiding when empty. The GenAI group is
 * promoted to the top when present; a graded or gated span surfaces its judge
 * verdict and guardrail decision inline, each linking back to the full result.
 */
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { formatLatency, formatScore } from "@/lib/format";
import {
  attrCount,
  evalMarker,
  groupAttributes,
  guardrailMarker,
  llmFacts,
  spanKind,
  spanService,
  spanStatus,
  type TypedAttr,
} from "@/lib/span";
import type { Span } from "@/lib/types";

import { ArrowRight, ChevronRight, Search } from "./icons";
import { CopyButton, CopyId, GuardrailBadge, Meter, VerdictBadge } from "./ui";

export default function SpanInspector({
  span,
  requestId,
}: {
  span: Span;
  requestId?: string;
}) {
  const [filter, setFilter] = useState("");
  const llm = useMemo(() => llmFacts(span), [span]);
  const evalM = useMemo(() => evalMarker(span), [span]);
  const guard = useMemo(() => guardrailMarker(span), [span]);
  const groups = useMemo(() => groupAttributes(span.attributes, filter), [span, filter]);
  const total = attrCount(span.attributes);
  const status = spanStatus(span);

  return (
    <aside className="card panel-sticky inspector" aria-label="Span detail">
      <div className="card-head">
        <h2>Span</h2>
        <span className="badge badge--neutral">{formatLatency(span.duration_ms)}</span>
      </div>

      <div className="insp-title">
        <span className="insp-name" title={span.name}>{span.name}</span>
        <CopyButton value={span.name} title="Copy span name" />
      </div>

      <Group id="overview" title="Overview" defaultOpen>
        <dl className="facts">
          <Fact label="Span ID"><CopyId value={span.span_id} /></Fact>
          <Fact label="Parent">
            {span.parent_span_id ? (
              <CopyId value={span.parent_span_id} />
            ) : (
              <span className="faint">root</span>
            )}
          </Fact>
          <Fact label="Service">{spanService(span) ?? <span className="faint">—</span>}</Fact>
          <Fact label="Kind">{spanKind(span) ?? <span className="faint">—</span>}</Fact>
          <Fact label="Status">
            <span className={`dot dot--${status}`} /> {status}
          </Fact>
          <Fact label="Start">
            <span className="mono">+{formatLatency(span.start_offset_ms)}</span>
          </Fact>
          <Fact label="Duration">
            <span className="mono">{formatLatency(span.duration_ms)}</span>
          </Fact>
        </dl>
      </Group>

      {llm && (
        <Group id="genai" title="GenAI / LLM" accent defaultOpen>
          <dl className="facts">
            {llm.requestModel && <Fact label="Model"><span className="mono">{llm.requestModel}</span></Fact>}
            {llm.responseModel && llm.responseModel !== llm.requestModel && (
              <Fact label="Response model"><span className="mono">{llm.responseModel}</span></Fact>
            )}
            {llm.provider && <Fact label="Provider"><span className="mono">{llm.provider}</span></Fact>}
            {llm.temperature !== undefined && <Fact label="Temperature"><span className="mono">{llm.temperature}</span></Fact>}
            {llm.topP !== undefined && <Fact label="top_p"><span className="mono">{llm.topP}</span></Fact>}
            {llm.topK !== undefined && <Fact label="top_k"><span className="mono">{llm.topK}</span></Fact>}
            {llm.maxTokens !== undefined && <Fact label="max_tokens"><span className="mono">{llm.maxTokens}</span></Fact>}
            {llm.inputTokens !== undefined && <Fact label="Input tokens"><span className="mono tnum">{llm.inputTokens}</span></Fact>}
            {llm.outputTokens !== undefined && <Fact label="Output tokens"><span className="mono tnum">{llm.outputTokens}</span></Fact>}
            {llm.finishReason !== undefined && <Fact label="Finish"><span className="mono">{llm.finishReason}</span></Fact>}
          </dl>
          {llm.prompt && <PayloadBlock label="Prompt" value={llm.prompt} />}
          {llm.completion && <PayloadBlock label="Completion" value={llm.completion} />}
          {!llm.prompt && !llm.completion && requestId && (
            <Link href={`/requests/${requestId}`} className="link inline insp-link">
              View prompt &amp; response <ArrowRight size={13} />
            </Link>
          )}
        </Group>
      )}

      {evalM && (
        <Group id="eval" title="Evaluation" defaultOpen>
          <div className="insp-verdict">
            <VerdictBadge verdict={evalM.verdict} />
            {evalM.score !== null && (
              <span className="insp-score mono">{formatScore(evalM.score)}</span>
            )}
            {evalM.judge && <span className="insp-judge">{evalM.judge}</span>}
          </div>
          {evalM.score !== null && <Meter value={evalM.score} verdict={evalM.verdict} />}
          {evalM.explanation && <PayloadBlock label="Judge reasoning" value={evalM.explanation} />}
          {requestId && (
            <Link href={`/requests/${requestId}`} className="link inline insp-link">
              View full eval result <ArrowRight size={13} />
            </Link>
          )}
        </Group>
      )}

      {guard && (
        <Group id="guardrail" title="Guardrail" defaultOpen>
          <div className="insp-verdict">
            <GuardrailBadge decision={guard.decision} />
            {guard.rule && <span className="insp-judge">{guard.rule}</span>}
          </div>
          <dl className="facts">
            {guard.stage && <Fact label="Stage"><span className="mono">{guard.stage}</span></Fact>}
            {guard.score !== null && <Fact label="Score"><span className="mono">{formatScore(guard.score)}</span></Fact>}
          </dl>
          {guard.reason && <PayloadBlock label="Reason" value={guard.reason} />}
          {requestId && (
            <Link href={`/requests/${requestId}`} className="link inline insp-link">
              View full guardrail result <ArrowRight size={13} />
            </Link>
          )}
        </Group>
      )}

      <Group
        id="attributes"
        title="Attributes"
        count={total}
        defaultOpen
        toolbar={
          <div className="attr-search">
            <Search size={13} />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter keys & values"
              aria-label="Filter attributes"
              spellCheck={false}
            />
          </div>
        }
      >
        {groups.length === 0 ? (
          <p className="faint insp-note">
            {total === 0 ? "No attributes on this span." : "No attributes match the filter."}
          </p>
        ) : (
          groups.map((g) => (
            <div className="attr-ns" key={g.id}>
              <div className="attr-ns-label">
                {g.label}
                <span className="attr-ns-count">{g.attrs.length}</span>
              </div>
              {g.attrs.map((attr) => (
                <AttrRow key={attr.key} attr={attr} />
              ))}
            </div>
          ))
        )}
      </Group>
    </aside>
  );
}

/* --- collapsible group -------------------------------------------------- */
function Group({
  id,
  title,
  count,
  accent,
  defaultOpen = false,
  toolbar,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  accent?: boolean;
  defaultOpen?: boolean;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`insp-group${accent ? " insp-group--accent" : ""}`}>
      <button
        type="button"
        className="insp-group-head"
        aria-expanded={open}
        aria-controls={`g-${id}`}
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronRight size={14} className={`insp-chevron${open ? " insp-chevron--open" : ""}`} />
        <span className="insp-group-title">{title}</span>
        {count !== undefined && <span className="insp-group-count">{count}</span>}
      </button>
      {open && (
        <div id={`g-${id}`} className="insp-group-body">
          {toolbar && <div className="insp-toolbar">{toolbar}</div>}
          {children}
        </div>
      )}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/* --- typed attribute row ------------------------------------------------ */
function AttrRow({ attr }: { attr: TypedAttr }) {
  return (
    <div className="attr-row">
      <div className="attr-key" title={attr.key}>{attr.key}</div>
      <div className="attr-val">
        <AttrValue attr={attr} />
        <CopyButton value={attr.raw} title={`Copy ${attr.key}`} size={12} />
      </div>
    </div>
  );
}

function AttrValue({ attr }: { attr: TypedAttr }) {
  if (attr.type === "json") {
    const isArray = Array.isArray(attr.json);
    const size = isArray
      ? (attr.json as unknown[]).length
      : Object.keys(attr.json as object).length;
    return (
      <details className="json">
        <summary>
          <span className="json-brace">{isArray ? "[" : "{"}</span>
          <span className="json-size">{size} {isArray ? "items" : "keys"}</span>
          <span className="json-brace">{isArray ? "]" : "}"}</span>
        </summary>
        <pre className="json-body">{JSON.stringify(attr.json, null, 2)}</pre>
      </details>
    );
  }
  if (attr.type === "boolean") {
    return <span className={`val-bool val-bool--${attr.raw}`}>{attr.raw}</span>;
  }
  if (attr.type === "null") return <span className="val-null">null</span>;
  if (attr.type === "number") return <span className="val-num mono tnum">{attr.raw}</span>;
  return <span className="val-str mono">{attr.raw}</span>;
}

/* --- scrollable, copyable text block (prompts, reasoning) --------------- */
function PayloadBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="payload-wrap">
      <div className="payload-head">
        <span className="payload-label">{label}</span>
        <CopyButton value={value} title={`Copy ${label.toLowerCase()}`} />
      </div>
      <pre className="payload">{value}</pre>
    </div>
  );
}
