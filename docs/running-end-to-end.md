# Running the full ARC stack locally

Audience: ARC engineers running all three services end to end. Reading time: 5 minutes.

arc-platform is only the UI and its BFF. It depends on two backends: arc-model-lab
(models, inference, experiments) and arc-eval-service (metric scoring). This guide
starts all three on one machine so you can exercise the console end to end: run an
inference, score it, and browse the results. Each service is its own repo, so the
backends start first and the console last.

For running arc-platform on its own against backends that are already up, see
[running-the-stack.md](running-the-stack.md).

```mermaid
flowchart LR
    B["Browser"] -->|/api same-origin| APP["arc-platform :3000"]
    APP -->|MODEL_LAB_URL| ML["arc-model-lab :8000"]
    APP -->|EVAL_SERVICE_URL| EV["arc-eval-service :8001"]
    ML -->|ARC_EVAL_SERVICE_URL| EV
```

## Ports

| Service          | App port | Postgres (host) | Database        |
| ---------------- | -------- | --------------- | --------------- |
| arc-model-lab    | 8000     | 5432            | `arc_model_lab` |
| arc-eval-service | 8001     | 5433            | `arc_eval`      |
| arc-platform     | 3000     | none            | none            |

Both backends default to app port 8000, and both Postgres compose files default to
host port 5432. arc-eval-service is moved to 8001 and 5433 below so the two run
side by side.

## Prerequisites

| Tool   | Version | For                          |
| ------ | ------- | ---------------------------- |
| Docker | recent  | Postgres for both backends   |
| uv     | recent  | the two Python services      |
| Node   | >= 20   | arc-platform                 |

Start the backends first; arc-platform only proxies to them. Use one terminal per
service.

## 1. arc-model-lab (:8000)

```bash
cd arc-model-lab
cp .env.example .env
# In .env, enable scoring by setting:
#   ARC_EVAL_SERVICE_URL=http://localhost:8001
docker compose up -d postgres    # Postgres on :5432
make migrate                     # create the schema
make model.seed                  # required, or /inference returns 404
make run                         # serves :8000 with reload
```

Check: `curl -s localhost:8000/health`. The first inference downloads the model
weights from HuggingFace once, then caches them locally.

## 2. arc-eval-service (:8001)

```bash
cd arc-eval-service
cp .env.example .env
```

Edit `.env` so it does not collide with arc-model-lab, and add a judge key:

```bash
POSTGRES_PORT=5433
ARC_EVAL_DATABASE_URL=postgresql+psycopg://arc:arc@localhost:5433/arc_eval
ARC_EVAL_API_PORT=8001
OPENAI_API_KEY=sk-...            # the key the default model profile references
```

```bash
docker compose up -d db          # Postgres on :5433
make migrate                     # create eval_requests / evaluation_results
make run                         # serves :8001 with reload
```

Check: `curl -s localhost:8001/health`. With no valid judge key, `/v1/evaluate`
still responds but returns `{"results": []}` and records each metric as errored.
Set `OPENAI_API_KEY`, or point the profile at a local OpenAI-compatible server, for
real scores.

## 3. arc-platform (:3000)

```bash
cd arc-platform
cp frontend/.env.local.example frontend/.env.local   # defaults target :8000 and :8001
make install
make dev                                              # http://localhost:3000
```

No edit is needed: `MODEL_LAB_URL` and `EVAL_SERVICE_URL` already default to the
ports above.

## Verify end to end

In the console at http://localhost:3000:

1. Overview shows both backends healthy (the `/api/v1/health` probe).
2. Models lists `qwen2.5-1.5b-instruct`.
3. Inference lab: pick the model, enter text, Run, then Evaluate against
   `faithfulness` and `answer_relevance`.
4. Evaluations browse shows the persisted request and its scores.

Or exercise the backends directly:

```bash
curl -s localhost:8000/inference -H 'content-type: application/json' \
  -d '{"model_name":"qwen2.5-1.5b-instruct","input_text":"Large language models summarize documents.","temperature":0.0}'

curl -s localhost:8001/v1/evaluate -H 'content-type: application/json' \
  -d '{"input_text":"Paris is the capital of France.","output_text":"Paris is France'\''s capital.","prompt":"Summarize.","metrics":["faithfulness"],"metadata":{"inference_id":"inf-1","model_id":"qwen-1.5b"}}'
```

To trace one request across the BFF, add `-H 'x-correlation-id: test-123'` to any
`curl localhost:3000/api/...` call and grep the arc-platform terminal for
`test-123` in the `bff.request` and `bff.upstream` log lines.

## Troubleshooting

| Symptom                             | Cause                                  | Fix                                                        |
| ----------------------------------- | -------------------------------------- | --------------------------------------------------------- |
| `docker compose up` cannot bind 5432 | both Postgres services default to 5432 | set `POSTGRES_PORT=5433` in arc-eval-service `.env`        |
| Console reports the eval service down | arc-eval-service still on 8000         | set `ARC_EVAL_API_PORT=8001`                              |
| `/inference` returns 404            | model catalog not seeded               | run `make model.seed` in arc-model-lab                    |
| Evaluation `results` is empty       | no judge key configured                | set `OPENAI_API_KEY` in arc-eval-service `.env`           |
| Experiment run `status: skipped`    | arc-model-lab has no eval URL          | set `ARC_EVAL_SERVICE_URL=http://localhost:8001`          |

## Shutdown

Stop each `make run` and `make dev` with `Ctrl-C`, then stop the databases:

```bash
cd arc-model-lab && docker compose down
cd arc-eval-service && docker compose down
```
