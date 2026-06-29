/*
 * Shared presentation primitives. Stateless and composable; the screens wire
 * them to data. State (verdicts, status) is always conveyed by color AND a
 * non-color cue (icon + label) for accessibility.
 */
import { useState, type ReactNode } from "react";

import { formatScore, GUARDRAIL_LABEL, VERDICT_LABEL } from "@/lib/format";
import type { GuardrailDecision, RequestStatus, Verdict } from "@/lib/types";

import {
  BlockIcon,
  Check,
  Copy,
  DegradeIcon,
  PassIcon,
} from "./icons";

/* --- Verdict & status badges ------------------------------------------- */
const VERDICT_ICON: Record<Verdict, typeof PassIcon> = {
  pass: PassIcon,
  degrade: DegradeIcon,
  block: BlockIcon,
  pending: DegradeIcon,
};
const VERDICT_CLASS: Record<Verdict, string> = {
  pass: "badge--pass",
  degrade: "badge--degrade",
  block: "badge--block",
  pending: "badge--neutral",
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const Icon = VERDICT_ICON[verdict];
  return (
    <span className={`badge ${VERDICT_CLASS[verdict]}`}>
      <Icon />
      {VERDICT_LABEL[verdict]}
    </span>
  );
}

/* --- Guardrail decision badge (domain-correct: allow / flag / block) ----
 * Shares the verdigris/amber/oxblood grammar but never the eval words. A
 * fail-open/fail-closed fallback is a distinct state, not a policy block. */
const DECISION_ICON: Record<GuardrailDecision, typeof PassIcon> = {
  allow: PassIcon,
  flag: DegradeIcon,
  block: BlockIcon,
  modify: DegradeIcon,
};
const DECISION_CLASS: Record<GuardrailDecision, string> = {
  allow: "badge--pass",
  flag: "badge--degrade",
  block: "badge--block",
  modify: "badge--degrade",
};

export function GuardrailBadge({
  decision,
  fallback,
}: {
  decision: GuardrailDecision;
  fallback?: boolean;
}) {
  const Icon = DECISION_ICON[decision];
  return (
    <span
      className={`badge ${DECISION_CLASS[decision]}${fallback ? " badge--fallback" : ""}`}
      title={fallback ? "Fail-open/closed fallback, not a policy decision" : undefined}
    >
      <Icon />
      {GUARDRAIL_LABEL[decision]}
      {fallback && <span className="badge-sub">fallback</span>}
    </span>
  );
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  const ok = status === "ok";
  return (
    <span className={`badge ${ok ? "badge--pass" : "badge--block"}`}>
      {ok ? <PassIcon /> : <BlockIcon />}
      {ok ? "OK" : "Error"}
    </span>
  );
}

/* --- Copy-on-click: value-as-button (IDs) and icon-only (blocks) -------- */
function useCopy(): [boolean, (value: string) => void] {
  const [done, setDone] = useState(false);
  const copy = (value: string) => {
    navigator.clipboard?.writeText(value).then(
      () => {
        setDone(true);
        setTimeout(() => setDone(false), 1100);
      },
      () => undefined,
    );
  };
  return [done, copy];
}

/* --- Copy-on-click ID (mono) ------------------------------------------- */
export function CopyId({
  value,
  display,
  title,
}: {
  value: string;
  display?: string;
  title?: string;
}) {
  const [done, copy] = useCopy();
  return (
    <button
      type="button"
      className={`copy-id${done ? " copy-id--done" : ""}`}
      onClick={() => copy(value)}
      title={title ?? `Copy ${value}`}
    >
      {display ?? value}
      <span className="copy-icon">{done ? <Check size={13} /> : <Copy size={13} />}</span>
    </button>
  );
}

/* --- Icon-only copy (for values, blocks, attribute rows) --------------- */
export function CopyButton({
  value,
  title = "Copy",
  size = 13,
}: {
  value: string;
  title?: string;
  size?: number;
}) {
  const [done, copy] = useCopy();
  return (
    <button
      type="button"
      className={`copy-btn${done ? " copy-btn--done" : ""}`}
      onClick={() => copy(value)}
      title={title}
      aria-label={title}
    >
      {done ? <Check size={size} /> : <Copy size={size} />}
    </button>
  );
}

/* --- "Why am I seeing this" hint --------------------------------------- */
export function Hint({ children }: { children: ReactNode }) {
  return (
    <span className="hint" tabIndex={0} role="note">
      i
      <span className="hint-tip">{children}</span>
    </span>
  );
}

/* --- Score meter -------------------------------------------------------- */
export function Meter({
  value,
  verdict = "pass",
}: {
  value: number;
  verdict?: Verdict;
}) {
  const cls =
    verdict === "block"
      ? "meter-fill--block"
      : verdict === "degrade" || verdict === "pending"
        ? "meter-fill--degrade"
        : "";
  return (
    <div className="meter" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={1}>
      <div className={`meter-fill ${cls}`} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

/* --- Sparkline (inline SVG, no deps) ----------------------------------- */
export function Sparkline({
  data,
  width = 96,
  height = 28,
  stroke = "var(--accent)",
}: {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
}) {
  if (data.length < 2) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((d, i) => {
    const x = i * step;
    const y = height - 2 - ((d - min) / range) * (height - 4);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const id = `sg-${Math.round(pts[0][1])}-${data.length}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} stroke="none" />
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* --- Stat card ---------------------------------------------------------- */
export function StatCard({
  label,
  value,
  unit,
  hint,
  trend,
  spark,
  sparkStroke,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  trend?: { dir: "up" | "down" | "flat"; text: string };
  spark?: number[];
  sparkStroke?: string;
}) {
  return (
    <div className="stat">
      <div className="stat-label">
        {label}
        {hint && <Hint>{hint}</Hint>}
      </div>
      <div className="row-between">
        <div className="stat-value tnum">
          {value}
          {unit && <small> {unit}</small>}
        </div>
        {spark && <Sparkline data={spark} stroke={sparkStroke} />}
      </div>
      {trend && (
        <div className="stat-foot">
          <span className={`trend trend--${trend.dir}`}>
            {trend.dir === "up" ? "▲" : trend.dir === "down" ? "▼" : "→"} {trend.text}
          </span>
        </div>
      )}
    </div>
  );
}

/* --- Tag ---------------------------------------------------------------- */
export function Tag({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>;
}

/* --- Skeleton rows ------------------------------------------------------ */
export function Skeleton({ height = 16, width = "100%", style }: { height?: number; width?: string | number; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ height, width, ...style }} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-wrap" style={{ padding: 14 }}>
      <div className="stack">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} style={{ display: "flex", gap: 16 }}>
            {Array.from({ length: cols }).map((__, c) => (
              <Skeleton key={c} height={14} width={c === 0 ? 160 : `${100 / cols}%`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- Empty state (teaches the next action) ----------------------------- */
export function EmptyState({
  art,
  title,
  children,
  actions,
}: {
  art?: ReactNode;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="empty">
      {art && <div className="empty-art">{art}</div>}
      <h3>{title}</h3>
      <p>{children}</p>
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  );
}

/* --- Score delta (run-to-run diff) ------------------------------------- */
export function ScoreDelta({ from, to }: { from: number | null; to: number | null }) {
  if (from === null || to === null) {
    return <span className="diff-delta diff-delta--same">—</span>;
  }
  const d = to - from;
  const cls = d > 0.001 ? "diff-delta--up" : d < -0.001 ? "diff-delta--down" : "diff-delta--same";
  const sign = d > 0 ? "+" : "";
  return (
    <span className={`diff-delta ${cls}`}>
      {Math.abs(d) < 0.001 ? "±0" : `${sign}${d.toFixed(3)}`}
    </span>
  );
}

export { formatScore };
