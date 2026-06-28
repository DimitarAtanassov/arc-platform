# ADR-0006 — PostgreSQL-backed normalised span store

**Status:** Accepted

## Context
Operators need to explore traces and quality with familiar tools and ad-hoc
queries ("token usage by model", "block rate by tenant"). A dedicated trace
backend (Tempo/Jaeger) is excellent for raw trace viewing but awkward for the
relational, cross-cutting queries ARC's console needs. We also want one
queryable store, not two systems to operate.

## Decision
Persist a **normalised Silver layer in PostgreSQL**: a generic `span` table plus
typed projections (`gen_ai_request`, `guardrail_decision`, `evaluation`).
Ingestion runs in the `arc-platform` BFF, fed OTLP/HTTP from the Collector.

Correctness invariants:
- **Idempotent upserts** keyed on `span_id`.
- **Out-of-order tolerant**: children may arrive before parents; lineage is not
  a blocking precondition.
- **Trace completion is derived** from root-span arrival plus a quiet period.

Retention is **time-based partitioning** with old-partition drops.

## Consequences
- Operators query with plain SQL; the console is just queries over Postgres.
- One store, one backup story, one set of skills.
- The cost: at very high volume a relational store needs care (partitioning,
  sampling, possibly a real trace backend alongside). We accept this for the
  expected scale and keep Tempo/Jaeger as a Phase-3 option for raw-trace depth.
- **Trigger to revisit:** sustained ingest beyond what partitioned Postgres
  handles comfortably → add a streaming ingest service and/or a trace backend.

Schema and queries: [Database Schema](../data/database-schema.md).
