# ADR-0010: Tenant-managed provider credentials (BYOK)

- **Status:** Accepted
- **Date:** 2026-06-28
- **Deciders:** Platform engineering, Security

## Context

Tenants want to bring their own inference-provider accounts (OpenAI, Anthropic,
Vertex) and their own infrastructure tokens, and register them **once** in ARC
rather than re-supplying credentials on every gateway call. Provider secrets are
high-sensitivity material: they must never sit in the trace store, never touch a
span, and never be logged. The gateway must stay thin and stateless, so it
cannot own a credential database.

## Decision

`arc-platform` exposes a **Connections** surface (UI + BFF) where a tenant syncs
provider/infra tokens. The split is **metadata vs secret**:

- **Secret material** lives only in a dedicated **secret manager** (GCP Secret
  Manager for MVP, Vault-compatible), keyed `arc/{tenant}/{provider}`. Tokens are
  write-only on input, never read back to the UI.
- **Metadata** (connection id, provider, status, last-4 hint, rotation date) is
  kept as secret-manager labels/versions, so `arc-platform` stays DB-less. No
  secret is ever stored relationally.

The gateway resolves credentials through a single **`CredentialsProvider` port**
(ports & adapters): per request it fetches the tenant's secret reference, caches
it briefly (short TTL), and injects it into the chosen provider adapter. If a
tenant has no connection, it falls back to a platform-managed default. Tokens are
validated on registration, support rotation/revocation, and every use emits an
audit span (id + provider only, never the value).

## Consequences

- **Easier:** tenants self-serve credentials once; gateway stays stateless and
  pulls via one port; secrets are isolated in a purpose-built store with IAM,
  rotation and audit; new providers/secret backends are new adapters.
- **Harder:** the gateway now depends on a secret manager on the hot path —
  mitigated by short-TTL caching and a fail-fast 401/connection error.
- **Revisit when:** connection volume or isolation needs justify extracting a
  standalone `arc-connections` service from the platform (YAGNI until then).

## Alternatives considered

- **Secrets in the platform DB (encrypted column)** — one store, but keeps
  high-value secrets next to telemetry and reinvents a secret manager. Rejected.
- **Credentials per request on the gateway API** — no sync, but forces every
  caller to hold provider keys and leaks them onto more hops. Rejected.
