# Service — arc-platform

**Role:** the product surface for operators. It is the **UI** plus a thin
**BFF**, and owns **no database**: it reads from `arc-guardrails`, `arc-evaluator`
and the OTel Collector's trace store via their APIs.

Keeping the platform read-only (KISS) means each domain owns its data. It can
grow a cache or aggregation store later if query latency demands — see
[ADR-0006](../adr/0006-postgres-span-store.md).

---

## Responsibilities

```mermaid
flowchart TD
    GRDB[("guardrail DB")] --> GR["arc-guardrails API"]
    EVDB[("evaluation DB")] --> EV["arc-evaluator API"]
    COLDB[("collector trace store")] --> BFF["Query API (BFF)"]
    GR --> BFF
    EV --> BFF
    BFF --> UI["Next.js UI"]
    UI --> OP["Operator"]
```

| Component | Job |
| --- | --- |
| **BFF (FastAPI)** | Read-only query API that aggregates guardrail, eval and trace data for the UI; auth; admin |
| **Connections (BYOK)** | Tenants sync provider/infra tokens here; secrets go to the secret manager, only metadata to the DB; see [ADR-0010](../adr/0010-byok-provider-credentials.md) |
| **UI (Next.js)** | Trace explorer, request inspector, evaluation + guardrail dashboards |

---

## UI surfaces (Phase 1)

| Surface | Shows |
| --- | --- |
| Trace explorer | The span tree for any request; drill into timing and attributes |
| Request inspector | One request end to end: guardrail decisions, model call, scores |
| Evaluation dashboard | Pass-rate and score trends (from the gold rollups) |
| Guardrail dashboard | Block / flag rate, detection types, by tenant |
| Provider connections | Sync/rotate provider API tokens (write-only); status + last-4 hint |

---

## Internal design

The BFF is a **read-only aggregation layer**: typed httpx clients call the
guardrail, evaluator and collector trace-store APIs, and the BFF composes their
responses for the UI. There is no write path and no database.

```
arc_platform/
  bff/
    query/        # read endpoints for the UI
    clients/      # guardrail + evaluator + collector API clients
    admin/        # tenants, content-capture toggles
  web/            # Next.js app (UI)
  config.py
  main.py
```

---

## Configuration

| Setting | Example | Notes |
| --- | --- | --- |
| `GUARDRAILS_URL` / `EVALUATOR_URL` | internal URLs | read APIs |
| `COLLECTOR_STORE_URL` | trace-store query API | read traces |
| `SECRET_MANAGER` | `gcp` | BYOK secret + metadata backend (Vault-compatible) |
| `CONTENT_CAPTURE` | per-tenant | off by default |

---

## Testing

- **Clients:** API clients tested against **respx**-recorded guardrail/eval/
  collector responses — no network.
- **Query API:** BFF aggregation tested with stubbed upstreams.
- **UI:** component tests on the explorer and dashboards.

## What it does **not** own
Inference, safety, scoring, **any database**. It reads and displays what the
other services emitted; it never participates in the hot path.
