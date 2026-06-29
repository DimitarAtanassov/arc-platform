# Running the ARC stack locally

How to bring up **all of ARC** on your machine and wire it together so a single
request flows **gateway → evaluator → (platform reads it back)** and lights up
the console. This is the operational companion to the platform
[README](../README.md); for the cross-repo canonical guide see
[arc-docs › Running the Stack](../../docs/arc-docs/docs/onboarding/running-the-stack.md).

> **TL;DR (Docker)** — `cp deploy/arc.env.example deploy/arc.env`, add your
> provider key(s), then `./arc up`. Open the console at
> **http://localhost:3000**, go to **Playground**, pick a provider, set a system
> prompt, and send a message — it's traced and scored end to end and shows up in
> Traces and Eval Runs.

---

## 0. One-command Docker stack (preferred)

The whole stack runs as containers (visible in Docker Desktop) via a single
control script. The shared `arc-telemetry` SDK is pulled from its Git source at
image-build time, so no sibling checkout is needed inside the images.

```bash
# 1. Configure (secrets live only in this gitignored file):
cp deploy/arc.env.example deploy/arc.env
#    edit deploy/arc.env → set ANTHROPIC_API_KEY (and/or OPENAI/GEMINI)

# 2. Build + start everything (collector, evaluator, gateway, BFF, UI):
./arc up                 # add --jaeger to also start the Jaeger UI :16686

# 3. Use it:
open http://localhost:3000          # console → Playground
./arc smoke                          # or drive a request from the CLI

# Lifecycle:
./arc ps        # container status
./arc logs gateway   # tail one service (omit name for all)
./arc restart platform-bff
./arc down      # stop + remove everything
```

| Container | Image | Host port |
| --- | --- | --- |
| `arc-collector` | otel-collector-contrib | 4317/4318/13133 |
| `arc-evaluator` | arc-eval-service | 8000 |
| `arc-gateway` | arc-gateway | 8080 |
| `arc-platform-bff` | arc-platform-backend | 8001 |
| `arc-platform-ui` | arc-platform-frontend | 3000 |

Inside the Docker network services reach each other by name on their internal
ports (e.g. the BFF reads the evaluator at `http://evaluator:8000` and the
gateway at `http://gateway:8000`); the browser uses the host-published `:8001`.

Source layout: [`arc`](../arc) (control script), [`deploy/`](../deploy)
(compose + `arc.env`), and the images in [`docker/`](../docker).

The process-based setup below remains for active backend development (hot
reload). Everything after this point is equivalent to what `./arc up` wires.

---

---

## 1. Topology & ports

```
 ┌────────────┐   OTLP    ┌──────────────────┐
 │  arc-       │◀──────────│ every service     │
 │  collector  │  :4317    │ (traces)          │
 └────────────┘           └──────────────────┘

 client ──HTTP──▶ arc-gateway ──score──▶ arc-evaluator ◀──reads── arc-platform BFF ◀── UI
                   :8080                   :8000   (system          :8001            :3000
                                                   of record)
```

| Service            | Dir                      | Port   | Health         | Depends on        |
| ------------------ | ------------------------ | ------ | -------------- | ----------------- |
| OTel Collector     | `arc-telemetry`          | 4317/4318/13133 | `:13133` | —          |
| arc-evaluator      | `arc-eval-service`       | **8000** | `GET /health` | (Postgres, opt.) + judge model |
| arc-gateway        | `arc-gateway`            | **8080** | `GET /healthz` | evaluator (opt-in) |
| arc-platform BFF   | `arc-platform`           | **8001** | `GET /health` | evaluator         |
| arc-platform UI    | `arc-platform/frontend`  | **3000** | —            | BFF               |

The hot path is **gateway → evaluator**. The platform is **read-only**: it polls
the evaluator's API for the requests, traces, runs and judge verdicts it renders.
The evaluator persists each scored interaction *with its case*, so it is the
system of record for the console.

---

## 2. Prerequisites

| Tool   | Version | Used for                         |
| ------ | ------- | -------------------------------- |
| Python | 3.13    | pinned per repo (`.python-version`) |
| uv     | ≥ 0.9   | venvs + dependency resolution    |
| Node   | ≥ 20    | the platform UI                  |
| Docker | recent  | the OTel Collector (optional)    |

**Repos must be siblings.** Every Python service resolves the shared
`arc-telemetry` SDK from a sibling path during local dev:

```
workspace/
├── arc-telemetry/        # shared OTel SDK + collector
├── arc-gateway/          # request orchestration + provider adapters
├── arc-eval-service/     # the evaluator (LLM-as-judge, system of record)
├── arc-platform/         # this repo — BFF + Next.js UI
└── docs/arc-docs/        # architecture + cross-repo guide
```

One-time prep (resolves the sibling SDK and installs deps):

```bash
( cd arc-eval-service && make prepare )
( cd arc-gateway      && uv sync --all-groups --frozen )
( cd arc-platform     && make prepare )
( cd arc-platform/frontend && npm install )
```

---

## 3. The judge-model key (BYOK)

The evaluator runs **LLM-as-a-judge**, so for real PASS / DEGRADE / BLOCK
verdicts it needs at least one **model profile** with an API key. The profile
references the key **by environment-variable name** (`api_key_env`) — the secret
itself stays in your environment and never lands in config, logs, spans, or git.

Keep the secret in a gitignored file you `source` only for the evaluator:

```bash
echo 'export ANTHROPIC_API_KEY=sk-ant-...' > ~/.arc.env
chmod 600 ~/.arc.env
```

> Without a profile the stack still runs end to end — inference, traces and
> requests are real — but scoring degrades cleanly (no judge verdicts). To run
> fully offline, point the gateway at the deterministic mock provider
> (`ARC_PROVIDER=mock`, the default) and skip the profile.

---

## 4. Start everything (in order)

Use a separate shell per service. **Order matters:** collector → evaluator →
gateway → platform BFF → UI.

```bash
# ── shell 1: OTel collector (optional but recommended) ──
cd arc-telemetry
docker compose -f docker/docker-compose.yaml up -d   # OTLP :4317/:4318, health :13133
curl -s -o /dev/null -w '%{http_code}\n' localhost:13133   # -> 200

# ── shell 2: evaluator on :8000, with a judge-model profile ──
cd arc-eval-service
source ~/.arc.env                                    # exports ANTHROPIC_API_KEY
ARC_EVAL_MODEL_PROFILES='[{"name":"default","provider":"anthropic","model":"claude-haiku-4-5","api_key_env":"ANTHROPIC_API_KEY"}]' \
ARC_EVAL_DEFAULT_MODEL=default \
ARC_EVAL_DEFAULT_JUDGE=safety \
ARC_OTEL_OTLP_ENDPOINT=http://localhost:4317 \
  uv run uvicorn arc_eval_service.api.main:app --port 8000
curl -s localhost:8000/health                        # {"status":"ok",...}
curl -s localhost:8000/v1/judges | jq '.[].name'     # safety, faithfulness, ...

# ── shell 3: gateway on :8080, online scoring wired ON ──
cd arc-gateway
ARC_PROVIDER=mock \
ARC_EVALUATOR_ENABLED=true \
ARC_EVALUATOR_URL=http://localhost:8000 \
ARC_EVALUATOR_JUDGE=safety \
ARC_EVALUATOR_MODEL=default \
ARC_OTEL_CAPTURE_CONTENT=true \
ARC_OTEL_OTLP_ENDPOINT=http://localhost:4317 \
  uv run uvicorn arc_gateway.api.main:app --port 8080

# ── shell 4: platform BFF on :8001, reading the evaluator ──
cd arc-platform
ARC_PLATFORM_EVALUATOR_URL=http://localhost:8000 \
ARC_PLATFORM_CORS_ORIGINS=http://localhost:3000 \
ARC_OTEL_OTLP_ENDPOINT=http://localhost:4317 \
  uv run uvicorn arc_platform.api.main:app --reload --reload-dir backend/src --port 8001

# ── shell 5: platform UI on :3000 ──
cd arc-platform/frontend
NEXT_PUBLIC_API_BASE=http://localhost:8001 npm run dev
```

> `ARC_EVALUATOR_MODEL=default` tells the gateway which evaluator **profile** to
> score with; `ARC_OTEL_CAPTURE_CONTENT=true` puts the prompt + completion on the
> span so the case is complete (and offline eval is possible).
>
> Real provider instead of the mock? Set `ARC_PROVIDER=anthropic` and
> `ARC_PROVIDER_API_KEY=$ANTHROPIC_API_KEY` on the **gateway** (separate from the
> evaluator's judge key).

---

## 5. End-to-end smoke test

```bash
# 1) Drive a request through the gateway (it scores online via the evaluator):
curl -s -X POST localhost:8080/v1/infer \
  -H 'content-type: application/json' \
  -d '{"prompt":"Summarize the incident report.","model":"mock"}' | jq
#   -> { request_id, trace_id, response, blocked:false, scores:{ "safety": <0..1> } }

# 2) Confirm the platform BFF sees it (reads back from the evaluator):
curl -s localhost:8001/v1/requests   | jq '.[0]'
curl -s localhost:8001/v1/eval-runs  | jq '.[0] | {verdict, aggregate_score, judges}'
curl -s localhost:8001/v1/judges     | jq '.[].name'

# 3) Open the console:
open http://localhost:3000
```

A single `/v1/infer` call produces: a gateway root span (`arc.gateway.infer`)
with the provider `llm.call` and judge spans beneath it; a persisted evaluation
record carrying the prompt/response/model/latency; and a request + reconstructed
trace + Dashboard row + Eval Run visible in the UI.

---

## 6. What you'll see in the console

| Screen              | Backed by                                   |
| ------------------- | ------------------------------------------- |
| **Playground**      | `GET /v1/providers` + `POST /v1/infer` → drive a real request (provider + system + message), traced and scored, with deep links to its trace and request |
| **Dashboard**       | verdict mix, latency trend, attention list, ingestion — from requests + eval-runs + summary |
| **Traces**          | `GET /v1/requests` → row opens the waterfall |
| **Trace / Spans**   | `GET /v1/traces/{id}` → waterfall + sticky span inspector |
| **Eval Runs**       | `GET /v1/eval-runs` → verdicts, scores, and per-run **run-to-run diff** |
| **Judges**          | `GET /v1/judges` + `/v1/evaluations/summary` for pass rates |
| **Settings**        | local prefs (theme/density/tenant) + `GET /v1/models` (read-only) |
| Eval Targets · Guardrails | teaching surfaces until their backends exist |

The BFF read endpoints (all `GET`, interactive docs at `localhost:8001/docs`):

| Path                          | Returns                                  |
| ----------------------------- | ---------------------------------------- |
| `/v1/requests`, `/{id}`       | recent requests / one request detail     |
| `/v1/traces/{trace_id}`       | reconstructed span tree                  |
| `/v1/evaluations/summary`     | per-judge pass-rate aggregate            |
| `/v1/eval-runs`, `/{id}`      | run table / one run + diff to prior run  |
| `/v1/judges`                  | registered judges (name, requires)       |
| `/v1/models`                  | configured judge-model profiles (no secrets) |
| `/v1/providers`               | providers the gateway can serve + whether each has a key |
| `POST /v1/infer`              | drive one inference through the gateway (Playground write path) |

---

## 7. Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| UI loads but every screen is empty | Evaluator unreachable or no data. Confirm `:8000/health`, then drive a `/v1/infer`. The BFF degrades to empty rather than erroring. |
| Requests appear, but **no verdicts / scores** | The evaluator has no model profile. Set `ARC_EVAL_MODEL_PROFILES` + `ARC_EVAL_DEFAULT_MODEL` and restart it. |
| `scores: {}` from the gateway | `ARC_EVALUATOR_ENABLED` is false, the judge name is wrong, or the profile/key is missing. |
| Browser console CORS error | `ARC_PLATFORM_CORS_ORIGINS` must include the UI origin (`http://localhost:3000`). |
| UI calls the wrong API | The browser uses `NEXT_PUBLIC_API_BASE`; point it at the BFF (`:8001`), not the evaluator. |
| "connection refused" on span export | The collector isn't running. Start it, or set `ARC_OTEL_ENABLE_OTLP=false` to silence export. |
| Port already in use | `lsof -ti tcp:PORT \| xargs kill`, or change the `--port`. |

---

## 8. Configuration reference

Telemetry (every service, via the shared SDK):

| Variable | Default | Meaning |
| --- | --- | --- |
| `ARC_OTEL_OTLP_ENDPOINT` | `http://localhost:4317` | Collector OTLP endpoint |
| `ARC_OTEL_ENABLE_OTLP`   | `true` | set `false` to disable span export |
| `ARC_OTEL_CAPTURE_CONTENT` | `false` | put prompt+completion on spans (gateway) |

Per service:

| Service | Variable | Default | Meaning |
| --- | --- | --- | --- |
| evaluator | `ARC_EVAL_MODEL_PROFILES` | `[]` | JSON judge-model profiles (BYOK, `api_key_env`) |
| evaluator | `ARC_EVAL_DEFAULT_MODEL` | — | profile used when a request omits one |
| evaluator | `ARC_EVAL_DEFAULT_JUDGE` | `safety` | judge for offline (OTel) ingestion |
| evaluator | `ARC_EVAL_DATABASE_URL` | — | Postgres URL; in-memory when unset |
| gateway | `ARC_PROVIDER` | `mock` | default provider when a request omits one |
| gateway | `ARC_ANTHROPIC_API_KEY` | — | per-provider key (also `ARC_OPENAI_API_KEY`, `ARC_GEMINI_API_KEY`) so the Playground can select any of them |
| gateway | `ARC_EVALUATOR_ENABLED` | `false` | turn online scoring on |
| gateway | `ARC_EVALUATOR_URL` | `http://localhost:8000` | evaluator base URL |
| gateway | `ARC_EVALUATOR_JUDGE` | `safety` | online judge to run |
| gateway | `ARC_EVALUATOR_MODEL` | — | evaluator profile for online scoring |
| platform | `ARC_PLATFORM_EVALUATOR_URL` | `http://localhost:8000` | evaluator base URL the BFF reads |
| platform | `ARC_PLATFORM_GATEWAY_URL` | `http://localhost:8080` | gateway base URL the Playground drives |
| platform | `ARC_PLATFORM_CORS_ORIGINS` | `["http://localhost:3000"]` | allowed UI origin(s); JSON when set via env |
| UI | `NEXT_PUBLIC_API_BASE` | `http://localhost:8001` | BFF base URL for the browser |

> **Provider keys & env prefixes.** The evaluator's BYOK profile references the
> standard `ANTHROPIC_API_KEY` by name. The gateway reads its own
> `ARC_`-prefixed copies (`ARC_ANTHROPIC_API_KEY`, …) — the Docker stack maps the
> standard names to the `ARC_`-prefixed ones for you (see `deploy/docker-compose.yaml`);
> for process-based runs, export both, or just set `ARC_<VENDOR>_API_KEY`.
