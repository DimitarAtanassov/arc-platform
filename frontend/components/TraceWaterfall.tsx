/*
 * Trace waterfall — structure and timing, scannable at production scale.
 *
 * Rows carry only navigational signal (name, service color, duration, status
 * cue, LLM/verdict markers); the full record lives in the span panel. Supports
 * collapse/expand subtrees, full keyboard control, and windowing so a trace of
 * thousands of spans stays smooth.
 *
 * Keyboard (focus the tree): up/down move, right expand or descend, left
 * collapse or ascend, Enter select, c copy span id.
 */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { formatLatency } from "@/lib/format";
import {
  buildSpanTree,
  evalMarker,
  guardrailMarker,
  llmFacts,
  serviceColor,
  spanService,
  spanStatus,
  type SpanNode,
} from "@/lib/span";
import type { Span, Trace } from "@/lib/types";

const ROW_H = 28; // px — must match --wf-row-h in globals.css
const VIRTUAL_THRESHOLD = 140;
const OVERSCAN = 14;
const TICKS = [0, 0.25, 0.5, 0.75, 1];

// Re-export for any importer that relied on the old helper name.
export { buildSpanTree as orderSpans };

function computeVisible(nodes: SpanNode[], collapsed: Set<string>): SpanNode[] {
  const out: SpanNode[] = [];
  let hideDepth = Number.POSITIVE_INFINITY;
  for (const node of nodes) {
    if (node.depth > hideDepth) continue;
    hideDepth = Number.POSITIVE_INFINITY;
    out.push(node);
    if (node.hasChildren && collapsed.has(node.span.span_id)) {
      hideDepth = node.depth;
    }
  }
  return out;
}

export default function TraceWaterfall({
  trace,
  selectedId,
  onSelect,
}: {
  trace: Trace;
  selectedId?: string | null;
  onSelect?: (span: Span) => void;
}) {
  const treeId = useId();
  const nodes = useMemo(() => buildSpanTree(trace.spans), [trace.spans]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const visible = useMemo(() => computeVisible(nodes, collapsed), [nodes, collapsed]);
  const total = trace.duration_ms || 1;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(480);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setViewportH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selectedIndex = visible.findIndex((n) => n.span.span_id === selectedId);

  // Keep the selected row in view as it moves under keyboard control.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || selectedIndex < 0) return;
    const top = selectedIndex * ROW_H;
    const bottom = top + ROW_H;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (bottom > el.scrollTop + el.clientHeight) {
      el.scrollTop = bottom - el.clientHeight;
    }
  }, [selectedIndex]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const select = (i: number) => {
    const node = visible[i];
    if (node) onSelect?.(node.span);
  };

  const parentIndex = (i: number): number => {
    const depth = visible[i]?.depth ?? 0;
    for (let j = i - 1; j >= 0; j -= 1) {
      if (visible[j].depth < depth) return j;
    }
    return -1;
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (selectedIndex < 0) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        select(0);
      }
      return;
    }
    const node = visible[selectedIndex];
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        select(Math.min(selectedIndex + 1, visible.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        select(Math.max(selectedIndex - 1, 0));
        break;
      case "ArrowRight":
        e.preventDefault();
        if (node.hasChildren && collapsed.has(node.span.span_id)) {
          toggle(node.span.span_id);
        } else if (node.hasChildren) {
          select(selectedIndex + 1);
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (node.hasChildren && !collapsed.has(node.span.span_id)) {
          toggle(node.span.span_id);
        } else {
          const p = parentIndex(selectedIndex);
          if (p >= 0) select(p);
        }
        break;
      case "Home":
        e.preventDefault();
        select(0);
        break;
      case "End":
        e.preventDefault();
        select(visible.length - 1);
        break;
      case "c":
        navigator.clipboard?.writeText(node.span.span_id);
        break;
      default:
        break;
    }
  };

  const allCollapsible = nodes.filter((n) => n.hasChildren).map((n) => n.span.span_id);
  const collapseAll = () => setCollapsed(new Set(allCollapsible));
  const expandAll = () => setCollapsed(new Set());

  // Windowing: render only rows near the viewport when the list is large.
  const virtual = visible.length > VIRTUAL_THRESHOLD;
  const start = virtual ? Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN) : 0;
  const end = virtual
    ? Math.min(visible.length, Math.ceil((scrollTop + viewportH) / ROW_H) + OVERSCAN)
    : visible.length;
  const slice = visible.slice(start, end);

  return (
    <div className="waterfall">
      <div className="wf-toolbar">
        <span className="wf-count">
          {visible.length === nodes.length
            ? `${nodes.length} spans`
            : `${visible.length} of ${nodes.length} spans`}
        </span>
        <div className="wf-toolbar-actions">
          <button type="button" className="btn btn--ghost btn--xs" onClick={collapseAll}>
            Collapse all
          </button>
          <button type="button" className="btn btn--ghost btn--xs" onClick={expandAll}>
            Expand all
          </button>
        </div>
      </div>

      <div className="wf-axis" aria-hidden="true">
        <span>span</span>
        <span className="wf-axis-ticks">
          {TICKS.map((t) => (
            <span key={t}>{t === 0 ? "0" : formatLatency(total * t)}</span>
          ))}
        </span>
        <span style={{ textAlign: "right" }}>duration</span>
      </div>

      <div
        className="wf-body"
        ref={scrollRef}
        onScroll={(e) => virtual && setScrollTop(e.currentTarget.scrollTop)}
        role="tree"
        aria-label="Span tree"
        aria-activedescendant={
          selectedIndex >= 0 ? `${treeId}-${selectedIndex}` : undefined
        }
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div className="wf-scroller" style={{ height: visible.length * ROW_H }}>
          <div className="wf-grid" aria-hidden="true">
            {TICKS.map((t) => (
              <span key={t} style={{ left: `${t * 100}%` }} />
            ))}
          </div>
          <div className="wf-window" style={{ transform: `translateY(${start * ROW_H}px)` }}>
            {slice.map((node, i) => (
              <Row
                key={node.span.span_id}
                id={`${treeId}-${start + i}`}
                node={node}
                total={total}
                active={node.span.span_id === selectedId}
                collapsed={collapsed.has(node.span.span_id)}
                onSelect={() => onSelect?.(node.span)}
                onToggle={() => toggle(node.span.span_id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  id,
  node,
  total,
  active,
  collapsed,
  onSelect,
  onToggle,
}: {
  id: string;
  node: SpanNode;
  total: number;
  active: boolean;
  collapsed: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const { span, depth, descendantCount, hasChildren } = node;
  const left = (span.start_offset_ms / total) * 100;
  const width = Math.max((span.duration_ms / total) * 100, 0.5);
  const service = spanService(span);
  const color = serviceColor(service);
  const status = spanStatus(span);
  const llm = llmFacts(span);
  const ev = evalMarker(span);
  const guard = guardrailMarker(span);

  return (
    <div
      id={id}
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={active}
      aria-expanded={hasChildren ? !collapsed : undefined}
      className={`wf-row${active ? " wf-row--active" : ""}`}
      onClick={onSelect}
    >
      <div className="wf-label" style={{ paddingLeft: depth * 15 }}>
        {hasChildren ? (
          <button
            type="button"
            className={`wf-toggle${collapsed ? "" : " wf-toggle--open"}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-label={collapsed ? "Expand" : "Collapse"}
            tabIndex={-1}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M3.5 2.5 6.5 5l-3 2.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <span className="wf-toggle wf-toggle--leaf" />
        )}
        <span className="wf-dot" style={{ background: color }} title={service ?? undefined} />
        <span className="wf-name" title={span.name}>{span.name}</span>
        {collapsed && descendantCount > 0 && (
          <span className="wf-collapsed-count">{descendantCount}</span>
        )}
        {llm?.requestModel && (
          <span className="wf-tag" title={`model ${llm.requestModel}`}>
            {llm.requestModel}
            {llm.totalTokens !== undefined && <em>{llm.totalTokens}t</em>}
          </span>
        )}
      </div>

      <div className="wf-track">
        <div
          className="wf-bar"
          style={{ left: `${left}%`, width: `${width}%`, background: color }}
          title={`${span.name} — ${formatLatency(span.duration_ms)}`}
        >
          {status === "error" && <span className="wf-bar-status" />}
        </div>
        {(ev || guard) && (
          <span
            className="wf-markers"
            style={{ left: `min(${left + width}%, calc(100% - 2px))` }}
          >
            {ev && <span className={`wf-marker wf-marker--${ev.verdict}`} title={`eval: ${ev.verdict}`} />}
            {guard && (
              <span className={`wf-marker wf-marker--g-${guard.decision}`} title={`guardrail: ${guard.decision}`} />
            )}
          </span>
        )}
      </div>

      <div className="wf-dur">{formatLatency(span.duration_ms)}</div>
    </div>
  );
}
