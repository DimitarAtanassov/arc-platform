# ADR-0005: Postgres as the MVP telemetry store

- **Status:** Accepted
- **Date:** 2026-06-28
- **Deciders:** Platform engineering

## Context

The platform UI (trace explorer, request inspector, eval and guardrail
dashboards) needs a queryable store. Purpose-built trace backends (Tempo,
Jaeger) and columnar stores (ClickHouse) scale further but add operational
surface. The draft did not specify a store at all.

## Decision

Use a single PostgreSQL database as the MVP system of record for traces, spans,
evaluations, guardrail decisions, and config. Partition the high-volume `trace`
and `span` tables by month. Lift hot query fields onto columns; keep evolving
attributes in JSONB.

## Consequences

- **Easier:** one store to run, back up, and query; rich SQL for the UI; one
  technology the team already knows well; partition-drop retention.
- **Harder:** Postgres is not a columnar OLAP engine; very high span volume or
  wide analytical scans will eventually strain it.
- **Revisit when:** sustained span volume is roughly an order of magnitude above
  the MVP estimate (~65 GB / 90 days), or analytical queries dominate. At that
  point introduce a columnar store (ClickHouse) or a trace backend (Tempo) behind
  the same collector export step — no application change required.

## Alternatives considered

- **ClickHouse / Tempo from day one** — better at scale, but more operational
  surface than MVP volume warrants (YAGNI).
- **Object storage + query engine** — cheap storage, poor interactive latency for
  a live trace explorer.
