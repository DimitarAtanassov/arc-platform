/*
 * Pure span analysis — the substrate the Trace Explorer reads.
 *
 * The platform receives spans as flat `Record<string, string>` attributes (the
 * evaluator flattens OTel AnyValues to strings on ingest). These helpers turn
 * that into typed values, namespace groups, and the cross-pillar links the UI
 * promises: a span carrying `arc.eval.*` was graded by a judge; a span carrying
 * `arc.guardrail.*` was gated by a policy. Deriving those here keeps the
 * components declarative and makes the logic unit-testable without a DOM.
 */
import type { GuardrailDecision, Span, Verdict } from "./types";

/* --- typed attribute values -------------------------------------------- */

export type AttrType = "string" | "number" | "boolean" | "json" | "null";

export interface TypedAttr {
  key: string;
  /** The original string the API returned. */
  raw: string;
  type: AttrType;
  /** Parsed value when `type === "json"` (object or array). */
  json?: unknown;
}

const NUMERIC = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

export function typeAttr(key: string, raw: string): TypedAttr {
  const trimmed = raw.trim();
  if (raw === "" || trimmed === "") return { key, raw, type: "string" };
  if (trimmed === "null") return { key, raw, type: "null" };
  if (trimmed === "true" || trimmed === "false") {
    return { key, raw, type: "boolean" };
  }
  if (NUMERIC.test(trimmed)) return { key, raw, type: "number" };
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed !== null && typeof parsed === "object") {
        return { key, raw, type: "json", json: parsed };
      }
    } catch {
      // not valid JSON — fall through to string.
    }
  }
  return { key, raw, type: "string" };
}

/* --- namespace grouping ------------------------------------------------- */

export interface AttrGroup {
  id: string;
  label: string;
  attrs: TypedAttr[];
}

// Order matters: earlier groups render first. Each entry owns the prefixes that
// route an attribute to it. `arc.llm.*`/`gen_ai.*`/`llm.*` collapse into one
// "GenAI" group so the reader sees one place for model telemetry.
const NAMESPACES: ReadonlyArray<{
  id: string;
  label: string;
  prefixes: readonly string[];
}> = [
  { id: "genai", label: "GenAI / LLM", prefixes: ["arc.llm.", "gen_ai.", "llm."] },
  { id: "eval", label: "Evaluation", prefixes: ["arc.eval."] },
  { id: "guardrail", label: "Guardrail", prefixes: ["arc.guardrail."] },
  { id: "http", label: "HTTP", prefixes: ["http.", "url.", "user_agent."] },
  { id: "rpc", label: "RPC", prefixes: ["rpc.", "grpc."] },
  { id: "db", label: "Database", prefixes: ["db."] },
  {
    id: "resource",
    label: "Resource",
    prefixes: [
      "service.",
      "deployment.",
      "host.",
      "process.",
      "cloud.",
      "k8s.",
      "container.",
      "telemetry.",
    ],
  },
  { id: "otel", label: "OpenTelemetry", prefixes: ["otel."] },
  { id: "arc", label: "ARC", prefixes: ["arc."] },
];

function namespaceFor(key: string): { id: string; label: string } {
  for (const ns of NAMESPACES) {
    if (ns.prefixes.some((p) => key.startsWith(p))) {
      return { id: ns.id, label: ns.label };
    }
  }
  return { id: "other", label: "Other" };
}

const GROUP_ORDER = [...NAMESPACES.map((n) => n.id), "other"];

/** Group attributes by namespace, typed, sorted, with optional text filter. */
export function groupAttributes(
  attributes: Record<string, string>,
  filter = "",
): AttrGroup[] {
  const needle = filter.trim().toLowerCase();
  const buckets = new Map<string, AttrGroup>();
  for (const [key, raw] of Object.entries(attributes)) {
    if (needle && !`${key} ${raw}`.toLowerCase().includes(needle)) continue;
    const ns = namespaceFor(key);
    let group = buckets.get(ns.id);
    if (!group) {
      group = { id: ns.id, label: ns.label, attrs: [] };
      buckets.set(ns.id, group);
    }
    group.attrs.push(typeAttr(key, raw));
  }
  for (const group of buckets.values()) {
    group.attrs.sort((a, b) => a.key.localeCompare(b.key));
  }
  return [...buckets.values()].sort(
    (a, b) => GROUP_ORDER.indexOf(a.id) - GROUP_ORDER.indexOf(b.id),
  );
}

export function attrCount(attributes: Record<string, string>): number {
  return Object.keys(attributes).length;
}

/* --- span identity ------------------------------------------------------ */

const FIRST = (
  attrs: Record<string, string>,
  ...keys: string[]
): string | undefined => {
  for (const k of keys) {
    const v = attrs[k];
    if (v !== undefined && v !== "") return v;
  }
  return undefined;
};

export function spanService(span: Span): string | null {
  return FIRST(span.attributes, "service.name") ?? serviceFromName(span.name);
}

// Fall back to the span-name namespace (arc.gateway.infer -> "gateway") so rows
// still color-code when a resource attribute did not ride along.
function serviceFromName(name: string): string | null {
  const parts = name.split(".");
  if (parts[0] === "arc" && parts.length > 1) return parts[1];
  return parts.length > 1 ? parts[0] : null;
}

export function spanKind(span: Span): string | null {
  return FIRST(span.attributes, "span.kind", "otel.kind") ?? null;
}

export type SpanStatus = "ok" | "error" | "unset";

export function spanStatus(span: Span): SpanStatus {
  const raw = FIRST(
    span.attributes,
    "otel.status_code",
    "status.code",
    "http.status_code",
  );
  if (!raw) return "unset";
  const lower = raw.toLowerCase();
  if (lower === "error" || lower === "2") return "error";
  const code = Number(raw);
  if (!Number.isNaN(code) && code >= 500) return "error";
  if (lower === "ok" || lower === "1") return "ok";
  return "unset";
}

/* --- deterministic service color --------------------------------------- */

// A small, theme-safe palette (hand-tuned hues that read on both ink and
// parchment). Hashing keeps a service the same color across every view.
const SERVICE_HUES = [205, 268, 152, 32, 340, 96, 250, 12];

export function serviceColor(service: string | null): string {
  if (!service) return "var(--data-ink)";
  let hash = 0;
  for (let i = 0; i < service.length; i += 1) {
    hash = (hash * 31 + service.charCodeAt(i)) >>> 0;
  }
  const hue = SERVICE_HUES[hash % SERVICE_HUES.length];
  return `hsl(${hue} 42% 58%)`;
}

/* --- LLM facts ---------------------------------------------------------- */

export interface LlmFacts {
  provider?: string;
  requestModel?: string;
  responseModel?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  temperature?: string;
  topP?: string;
  topK?: string;
  maxTokens?: string;
  finishReason?: string;
  prompt?: string;
  completion?: string;
}

const num = (v: string | undefined): number | undefined => {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

export function llmFacts(span: Span): LlmFacts | null {
  const a = span.attributes;
  const provider = FIRST(a, "arc.llm.provider", "gen_ai.system", "llm.provider");
  const requestModel = FIRST(
    a,
    "arc.llm.request.model",
    "gen_ai.request.model",
    "llm.request.model",
    "arc.model",
  );
  const responseModel = FIRST(
    a,
    "arc.llm.response.model",
    "gen_ai.response.model",
  );
  const input = num(FIRST(a, "arc.llm.usage.input_tokens", "gen_ai.usage.input_tokens"));
  const output = num(
    FIRST(a, "arc.llm.usage.output_tokens", "gen_ai.usage.output_tokens"),
  );
  if (
    !provider &&
    !requestModel &&
    !responseModel &&
    input === undefined &&
    output === undefined
  ) {
    return null;
  }
  const total =
    input !== undefined || output !== undefined
      ? (input ?? 0) + (output ?? 0)
      : undefined;
  return {
    provider,
    requestModel,
    responseModel,
    inputTokens: input,
    outputTokens: output,
    totalTokens: total,
    temperature: FIRST(a, "arc.llm.request.temperature", "gen_ai.request.temperature"),
    topP: FIRST(a, "arc.llm.request.top_p", "gen_ai.request.top_p"),
    topK: FIRST(a, "arc.llm.request.top_k", "gen_ai.request.top_k"),
    maxTokens: FIRST(a, "arc.llm.request.max_tokens", "gen_ai.request.max_tokens"),
    finishReason: FIRST(a, "arc.llm.response.finish_reasons", "gen_ai.response.finish_reasons"),
    prompt: FIRST(a, "arc.llm.prompt", "gen_ai.prompt", "llm.prompt"),
    completion: FIRST(a, "arc.llm.completion", "gen_ai.completion", "llm.completion"),
  };
}

/* --- cross-pillar markers: eval + guardrail ----------------------------- */

export interface EvalMarker {
  verdict: Verdict;
  score: number | null;
  label: string | null;
  judge: string | null;
  explanation: string | null;
}

function scoreToVerdict(score: number | null, label: string | null): Verdict {
  const l = label?.toLowerCase();
  if (l === "block" || l === "fail" || l === "blocked") return "block";
  if (l === "degrade" || l === "warn" || l === "partial") return "degrade";
  if (l === "pass" || l === "ok") return "pass";
  if (score === null) return "pending";
  if (score < 0.5) return "block";
  if (score < 0.85) return "degrade";
  return "pass";
}

/** A judge graded this span when it carries `arc.eval.*` attributes. */
export function evalMarker(span: Span): EvalMarker | null {
  const a = span.attributes;
  const name = FIRST(a, "arc.eval.name");
  const scoreRaw = FIRST(a, "arc.eval.score");
  const label = FIRST(a, "arc.eval.label") ?? null;
  const explanation = FIRST(a, "arc.eval.explanation") ?? null;
  if (name === undefined && scoreRaw === undefined && label === null) return null;
  const score = num(scoreRaw) ?? null;
  return {
    verdict: scoreToVerdict(score, label),
    score,
    label,
    judge: name ?? null,
    explanation,
  };
}

export interface GuardrailMarker {
  decision: GuardrailDecision;
  rule: string | null;
  reason: string | null;
  stage: string | null;
  score: number | null;
}

function toDecision(raw: string | undefined): GuardrailDecision {
  switch (raw?.toLowerCase()) {
    case "block":
    case "blocked":
      return "block";
    case "flag":
    case "flagged":
      return "flag";
    case "modify":
    case "modified":
      return "modify";
    default:
      return "allow";
  }
}

/** A policy gated this span when it carries `arc.guardrail.*` attributes. */
export function guardrailMarker(span: Span): GuardrailMarker | null {
  const a = span.attributes;
  const name = FIRST(a, "arc.guardrail.name");
  const decisionRaw = FIRST(a, "arc.guardrail.decision");
  if (name === undefined && decisionRaw === undefined) return null;
  return {
    decision: toDecision(decisionRaw),
    rule: name ?? null,
    reason: FIRST(a, "arc.guardrail.reason") ?? null,
    stage: FIRST(a, "arc.guardrail.stage") ?? null,
    score: num(FIRST(a, "arc.guardrail.score")) ?? null,
  };
}

/* --- trace-level rollups (header chips) --------------------------------- */

export interface TraceRollup {
  services: string[];
  errorCount: number;
  evalSpans: number;
  guardrailSpans: number;
  worstEval: Verdict | null;
  worstGuardrail: GuardrailDecision | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  hasTokens: boolean;
}

const VERDICT_RANK: Record<Verdict, number> = { pass: 0, pending: 1, degrade: 2, block: 3 };
const DECISION_RANK: Record<GuardrailDecision, number> = {
  allow: 0,
  modify: 1,
  flag: 2,
  block: 3,
};

export function traceRollup(spans: Span[]): TraceRollup {
  const services = new Set<string>();
  let errorCount = 0;
  let evalSpans = 0;
  let guardrailSpans = 0;
  let worstEval: Verdict | null = null;
  let worstGuardrail: GuardrailDecision | null = null;
  let inTok = 0;
  let outTok = 0;
  let hasTokens = false;

  for (const span of spans) {
    const svc = spanService(span);
    if (svc) services.add(svc);
    if (spanStatus(span) === "error") errorCount += 1;

    const ev = evalMarker(span);
    if (ev) {
      evalSpans += 1;
      if (worstEval === null || VERDICT_RANK[ev.verdict] > VERDICT_RANK[worstEval]) {
        worstEval = ev.verdict;
      }
    }
    const gr = guardrailMarker(span);
    if (gr) {
      guardrailSpans += 1;
      if (
        worstGuardrail === null ||
        DECISION_RANK[gr.decision] > DECISION_RANK[worstGuardrail]
      ) {
        worstGuardrail = gr.decision;
      }
    }
    const llm = llmFacts(span);
    if (llm) {
      if (llm.inputTokens !== undefined) {
        inTok += llm.inputTokens;
        hasTokens = true;
      }
      if (llm.outputTokens !== undefined) {
        outTok += llm.outputTokens;
        hasTokens = true;
      }
    }
  }

  return {
    services: [...services].sort(),
    errorCount,
    evalSpans,
    guardrailSpans,
    worstEval,
    worstGuardrail,
    totalInputTokens: inTok,
    totalOutputTokens: outTok,
    hasTokens,
  };
}

/* --- tree layout: order, depth, descendant counts ----------------------- */

export interface SpanNode {
  span: Span;
  depth: number;
  childCount: number;
  descendantCount: number;
  hasChildren: boolean;
}

/** Depth-first ordering with per-node child/descendant counts for the tree. */
export function buildSpanTree(spans: Span[]): SpanNode[] {
  const byParent = new Map<string | null, Span[]>();
  for (const span of spans) {
    const bucket = byParent.get(span.parent_span_id) ?? [];
    bucket.push(span);
    byParent.set(span.parent_span_id, bucket);
  }
  for (const bucket of byParent.values()) {
    bucket.sort((a, b) => a.start_offset_ms - b.start_offset_ms);
  }

  const present = new Set(spans.map((s) => s.span_id));
  const out: SpanNode[] = [];

  const countDescendants = (id: string): number => {
    const kids = byParent.get(id) ?? [];
    return kids.reduce((acc, k) => acc + 1 + countDescendants(k.span_id), 0);
  };

  const walk = (parent: string | null, depth: number): void => {
    for (const span of byParent.get(parent) ?? []) {
      const kids = byParent.get(span.span_id) ?? [];
      out.push({
        span,
        depth,
        childCount: kids.length,
        descendantCount: countDescendants(span.span_id),
        hasChildren: kids.length > 0,
      });
      walk(span.span_id, depth + 1);
    }
  };

  // Roots: a true null parent, or an orphan whose parent is not in the trace.
  const rootKeys = [...byParent.keys()].filter(
    (k) => k === null || !present.has(k),
  );
  for (const key of rootKeys) walk(key, 0);
  return out;
}
