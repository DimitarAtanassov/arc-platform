#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# arc — control the full ARC local stack (Docker).
#
#   ./arc up [--jaeger]   build + start everything (detached)
#   ./arc down            stop + remove all containers
#   ./arc restart [svc]   restart the stack (or one service)
#   ./arc ps              show container status
#   ./arc logs [svc]      tail logs (all, or one service)
#   ./arc build           (re)build images without starting
#   ./arc smoke           drive a test inference through the BFF
#   ./arc urls            print the local URLs
#
# Config (incl. provider keys) is read from deploy/arc.env. Copy the example:
#   cp deploy/arc.env.example deploy/arc.env   # then fill in your keys
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT/deploy/arc.env"
COMPOSE_FILE="$ROOT/deploy/docker-compose.yaml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "✗ $ENV_FILE not found. Create it:  cp deploy/arc.env.example deploy/arc.env" >&2
  exit 1
fi

# docker compose v2 (plugin) vs legacy docker-compose.
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
else
  DC=(docker-compose)
fi
compose() { "${DC[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

CORE_URLS() {
  cat <<EOF
  Console (UI)      http://localhost:3000
  Platform BFF      http://localhost:8001/docs
  Gateway           http://localhost:8080/docs
  Evaluator         http://localhost:8000/docs
  Collector health  http://localhost:13133
EOF
}

cmd="${1:-help}"; shift || true

case "$cmd" in
  up)
    profiles=()
    [[ "${1:-}" == "--jaeger" ]] && profiles=(--profile jaeger)
    echo "→ building + starting the ARC stack…"
    compose ${profiles[@]+"${profiles[@]}"} up -d --build
    echo "✓ stack is up:"
    CORE_URLS
    [[ ${#profiles[@]} -gt 0 ]] && echo "  Jaeger UI         http://localhost:16686"
    ;;
  down)
    echo "→ stopping the ARC stack…"
    compose --profile jaeger down --remove-orphans
    echo "✓ stack is down."
    ;;
  restart)
    compose restart "$@"
    ;;
  ps)
    compose ps
    ;;
  logs)
    compose logs -f --tail=120 "$@"
    ;;
  build)
    compose build "$@"
    ;;
  urls)
    CORE_URLS
    ;;
  smoke)
    echo "→ POST /v1/infer via the BFF (provider=mock)…"
    curl -fsS -X POST http://localhost:8001/v1/infer \
      -H 'content-type: application/json' \
      -d '{"prompt":"Summarize the incident report.","model":"mock","provider":"mock","system":"Be precise and terse."}' \
      && echo
    echo "→ recent eval runs:"
    curl -fsS http://localhost:8001/v1/eval-runs | head -c 400 && echo
    ;;
  help|--help|-h|"")
    sed -n '3,17p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    ;;
  *)
    echo "unknown command: $cmd (try ./arc help)" >&2
    exit 1
    ;;
esac
