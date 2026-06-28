# arc-platform

The **product surface** of the ARC AI control plane — a production-grade internal
platform for **trace, request and evaluation visualization**, in the spirit of
Datadog / LangSmith / OpenTelemetry dashboards.

This is a **vertical-slice MVP**: a FastAPI BFF serving deterministic mock data
and a Next.js UI that renders it. There is no router, policy engine, evaluator,
queue, or shared contracts package yet (YAGNI) — those are future ARC systems
this platform will integrate with.

```text
arc-platform/
  backend/                     # FastAPI BFF (strict src/ layout)
    src/arc_platform/
      api/                     # routing + app assembly only (no business logic)
      services/                # aggregation + serving logic (DRY lives here)
      core/                    # config, JSON logging, errors, DI wiring
      db/                      # in-memory mock data store (MVP data source)
      schemas/                 # Pydantic domain + API models
    tests/                     # unit / integration / e2e
  frontend/                    # Next.js (Pages Router) + TypeScript
    components/ pages/ lib/ styles/
  docker/                      # backend + frontend images, docker-compose
  pyproject.toml  Makefile  README.md
```

## Architecture

Strict one-directional layering — **api → services → db** — with `core` and
`schemas` as cross-cutting support. The API layer never reaches past services
into the data store; services never import FastAPI. The data source sits behind
`db/store.py:MockDataStore` and is a drop-in seam for a real backing store
(e.g. reading traces from arc-gateway) later.

Principles applied: KISS, YAGNI, DRY (only in the service layer), SOLID service
boundaries, and observability-first (structured JSON logging on every line).

## Data model (MVP)

Local Pydantic models in `backend/src/arc_platform/schemas/models.py` — **not**
extracted to a shared `arc-contracts` package:

- **Request** (`RequestSummary` / `RequestDetail`) — `request_id`, `trace_id`,
  `latency_ms`, `model_name`, `timestamp`, `status` (+ prompt/response/tokens).
- **Trace** — `trace_id`, `request_id`, `duration_ms`, `spans[]`.
- **Span** — `span_id`, `parent_span_id`, `name`, offsets, `attributes`.
- **EvaluationResult** + aggregated `EvaluationSummary` (placeholder logic).

Because upstream systems don't exist yet, the store **seeds deterministic mock
data on startup** (seed configurable via `ARC_PLATFORM_MOCK_SEED`). The UI works
fully without arc-gateway.

## API

| Method & path                  | Description                          |
| ------------------------------ | ------------------------------------ |
| `GET /health`                  | Service status                       |
| `GET /v1/requests?limit=`      | Recent requests (most recent first)  |
| `GET /v1/requests/{id}`        | Full request inspection payload      |
| `GET /v1/traces/{trace_id}`    | Full span tree for a trace           |
| `GET /v1/evaluations/summary`  | Aggregated evaluation dashboard data |

Interactive docs at `http://localhost:8000/docs`.

## Frontend pages

- **Requests** (`/`) — request list; click a row to inspect.
- **Request detail** (`/requests/[id]`) — metadata, prompt/response, inline
  trace waterfall, link into the Trace Explorer.
- **Trace Explorer** (`/traces/[id]`) — full span waterfall for a trace.
- **Evaluations** (`/evaluations`) — placeholder evaluation dashboard.

## Running locally

### Backend (uv)

```bash
uv sync --all-groups            # install everything
uv run uvicorn arc_platform.api.main:app --reload
# or:
make run
```

```bash
curl -s localhost:8000/health
curl -s localhost:8000/v1/requests | head
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev                     # http://localhost:3000
# or from the repo root:
make frontend
```

Point the UI at a non-default backend by copying `frontend/.env.local.example`
to `frontend/.env.local`.

### Both at once

```bash
make stack                      # backend :8000 + frontend :3000
```

## Testing

```bash
make test                       # full suite + coverage gate (fails under 80%)
make test-unit                  # services layer only
make test-integration           # API via httpx AsyncClient
make test-e2e                   # request -> detail -> trace flow (mocked)
```

Tests require no external services. Markers (`unit`, `integration`, `e2e`) are
declared in `pyproject.toml`; `asyncio_mode = auto`.

## Quality gate

```bash
make lint                       # uv lock --check + ruff format/check + mypy strict
make check                      # lint + tests + coverage  (full CI gate)
```

- **ruff** with the full rule set (`F,E,W,C90,I,N,UP,YTT,ANN,ASYNC,S,BLE,B,A,C4,PT,PL,PERF,RUF`), max complexity 12, max args 8.
- **mypy** strict mode with the pydantic plugin.
- **coverage** branch-enabled, `fail_under = 80` (currently ~98%).

## Docker

```bash
# backend image
make docker
docker run --rm -p 8000:8000 arc-platform-backend:latest

# backend + frontend together
docker compose -f docker/docker-compose.yml up --build
```

## Future integration

`db/store.py` is the only data seam. Replacing `MockDataStore` with a reader for
real arc-gateway traces requires no changes to `services/` or `api/` — same read
methods, same models.
