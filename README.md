# arc-platform

The **product surface** of the ARC AI control plane — an internal platform for
**trace, request and evaluation visualization**, in the spirit of Datadog /
LangSmith / OpenTelemetry dashboards. A FastAPI BFF plus a Next.js UI.

The platform holds **no database of its own** (by design). It reads live from
the **arc-evaluator** API, which persists each scored interaction with its case
(prompt, response, model, latency, trace id) and is the system of record for the
console. See [arc-docs › services/arc-platform](../docs/arc-docs/docs/services/arc-platform.md)
and, to run it with the rest of ARC,
[Running the Stack](../docs/arc-docs/docs/onboarding/running-the-stack.md).

```text
arc-platform/
  backend/                     # FastAPI BFF (strict src/ layout)
    src/arc_platform/
      api/                     # routing + app assembly only (no business logic)
      services/                # aggregation + serving logic (DRY lives here)
      clients/                 # EvalServiceClient — reads the evaluator API
      core/                    # config, JSON logging, errors, DI wiring
      schemas/                 # Pydantic domain + API models
    tests/                     # unit / integration / e2e
  frontend/                    # Next.js (Pages Router) + TypeScript
  docker/                      # backend + frontend images, docker-compose
  pyproject.toml  Makefile  README.md
```

## Architecture

One-directional layering — **api → services → clients** — with `core` and
`schemas` as cross-cutting support. The data source sits behind
`clients/eval_service.py:EvalReader`; the concrete `EvalServiceClient` polls the
evaluator and maps records into the UI's view models with **pure mapper
functions** (record dict → model). Trace views read the evaluator's real span
tree at `GET /v1/traces/{trace_id}`. Reads **degrade gracefully**: if the
evaluator is unreachable, list views return empty rather than failing the page.

Telemetry, propagation and trace-context for the BFF's outbound calls come from
the shared `arc-telemetry` SDK.

## Data model

Local Pydantic models in `backend/src/arc_platform/schemas/models.py` (not yet a
shared `arc-contracts` package — YAGNI):

- **Request** (`RequestSummary` / `RequestDetail`), **Trace** + **Span**,
  **EvaluationResult** + aggregated `EvaluationSummary`.

The **trace waterfall is the real span tree**: the evaluator owns a span store
(spans the collector fans to it) and serves it at `GET /v1/traces/{trace_id}`,
so the inspector shows the actual `arc.llm.*` (inference) and `arc.eval.*`
(evaluation) attributes rather than a waterfall reconstructed from latencies.

## API

| Method & path                  | Description                          |
| ------------------------------ | ------------------------------------ |
| `GET /health`                  | Service status                       |
| `GET /v1/requests?limit=`      | Recent requests (most recent first)  |
| `GET /v1/requests/{id}`        | Full request inspection payload      |
| `GET /v1/traces/{trace_id}`    | Real span tree for a trace (evaluator span store) |
| `GET /v1/evaluations/summary`  | Aggregated evaluation dashboard data |

Interactive docs at `http://localhost:8001/docs`.

## Running locally

The platform needs the **evaluator** as its data source. Drive a request through
the gateway first (so the evaluator has data), then start the platform.

### Backend (uv)

```bash
make prepare                    # uv sync (resolves arc-telemetry sibling)
ARC_PLATFORM_EVALUATOR_URL=http://localhost:8000 \
  uv run uvicorn arc_platform.api.main:app --reload --reload-dir backend/src --port 8001
curl -s localhost:8001/v1/requests | head
```

### Frontend (Next.js)

```bash
cd frontend
NEXT_PUBLIC_API_BASE=http://localhost:8001 npm install && npm run dev   # :3000
```

### Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `ARC_PLATFORM_EVALUATOR_URL` | `http://localhost:8000` | evaluator base URL the BFF reads |
| `ARC_PLATFORM_EVALUATOR_TIMEOUT_S` | `5.0` | per-request read timeout |
| `ARC_PLATFORM_CORS_ORIGINS` | `http://localhost:3000` | allowed UI origin |
| `ARC_OTEL_OTLP_ENDPOINT` | `http://localhost:4317` | Collector endpoint |
| `NEXT_PUBLIC_API_BASE` (UI) | `http://localhost:8000` | BFF base URL for the browser |

## Testing

```bash
make test                       # full suite + coverage gate (fails under 80%)
make test-unit                  # services + client mapping (respx)
make test-integration           # API via httpx AsyncClient (fake reader)
make test-e2e                   # request -> detail -> trace flow
```

Tests require no external services: a `FakeReader`/`respx` stands in for the
evaluator. `asyncio_mode = auto`.

## Quality gate

```bash
make lint                       # uv lock --check + ruff format/check + mypy strict
make check                      # lint + tests + coverage  (full CI gate)
```

coverage is branch-enabled, `fail_under = 80` (currently ~96%).

## Docker

The backend image installs the shared `arc-telemetry` SDK, which lives in a
sibling repo — so building the per-service image in isolation is a known
follow-up (publish the SDK to a registry). For local development use the
process-based run above; see
[Running the Stack › Containers](../docs/arc-docs/docs/onboarding/running-the-stack.md#8-containers-note).
