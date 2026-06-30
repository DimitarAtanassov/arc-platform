.DEFAULT_GOAL := help

sources = backend/src backend/tests

.PHONY: help
help:
	@grep -E '^\.PHONY: .*?## .*$$' $(MAKEFILE_LIST) | \
		sort | \
		awk 'BEGIN {FS = ".PHONY: |## "}; {printf "\033[36m%-19s\033[0m %s\n", $$2, $$3}'

.PHONY: prepare ## Install packages, prepare virtual environment
prepare:
	uv sync --all-groups --frozen

.PHONY: lintable ## Apply auto-formatting and auto-linting
lintable: prepare
	uv run ruff format $(sources)
	uv run ruff check --fix $(sources)

.PHONY: lint ## Run linting checks
lint: prepare
	uv lock --check
	uv run ruff format --check $(sources)
	uv run ruff check $(sources)
	uv run mypy $(sources)

.PHONY: test ## Run tests and coverage reports
test: prepare
	uv run coverage run -m pytest
	uv run coverage report

.PHONY: test-unit ## Run service-layer unit tests
test-unit: prepare
	uv run pytest -m unit

.PHONY: test-integration ## Run integration tests
test-integration: prepare
	uv run pytest -m integration

.PHONY: test-e2e ## Run end-to-end flow tests
test-e2e: prepare
	uv run pytest -m e2e

.PHONY: check ## Full quality gate: lint + tests + coverage
check: lint test

.PHONY: run ## Run the backend (FastAPI BFF) locally
run: prepare
	uv run uvicorn arc_platform.api.main:app --reload --reload-dir backend/src

.PHONY: frontend ## Run the Next.js frontend dev server
frontend:
	cd frontend && npm install && npm run dev

.PHONY: stack ## Run the full stack: backend (:8000) + frontend (:3000)
stack: prepare
	@echo "Starting backend on :8000 and frontend on :3000 (Ctrl-C to stop both)"
	@trap 'kill 0' INT TERM; \
		uv run uvicorn arc_platform.api.main:app --reload --reload-dir backend/src & \
		(cd frontend && npm install && npm run dev) & \
		wait

.PHONY: clean ## Remove caches and build artifacts
clean:
	rm -rf `find . -name __pycache__ -not -path './frontend/node_modules/*'`
	rm -f `find . -type f -name '*.py[co]' -not -path './frontend/node_modules/*'`
	rm -rf .pytest_cache
	rm -rf .ruff_cache
	rm -rf .mypy_cache
	rm -rf htmlcov
	rm -rf *.egg-info
	rm -f .coverage
	rm -f .coverage.*
	rm -f coverage.xml
	rm -rf build
	rm -rf dist
	rm -rf frontend/.next

.PHONY: package ## Build a python package (backend BFF)
package: prepare
	uv build

.PHONY: docker ## Build the backend container image
docker:
	docker build -f docker/Dockerfile -t arc-platform-backend:latest .

.PHONY: docker-run ## Build and run the backend container
docker-run: docker
	docker run --rm -p 8000:8000 arc-platform-backend:latest

.PHONY: compose ## Run backend + frontend via docker compose
compose:
	docker compose -f docker/docker-compose.yml up --build

# Database lifecycle for the full stack — thin wrappers over ./arc so the
# compose wiring stays single-sourced. Data persists on the arc-pgdata volume;
# only db-destroy removes it (and it asks first).
.PHONY: db-up ## Start just the Postgres service
db-up:
	./arc db-up

.PHONY: db-migrate ## Apply database migrations to head
db-migrate:
	./arc db-migrate

.PHONY: db-shell ## Open a psql shell on the evaluator database
db-shell:
	./arc db-shell

.PHONY: db-destroy ## Stop the stack and DELETE the database volume (asks first)
db-destroy:
	./arc db-destroy
