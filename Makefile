.DEFAULT_GOAL := help

# ARC Research Console — a single Next.js app that serves the UI and is the BFF
# (Route Handlers under /api) over arc-model-lab. One TypeScript toolchain, one
# image. There is no separate Python service, so "backend" here means the BFF /
# server layer (src/server) and "frontend" means the UI (src/app, src/components,
# src/features, src/lib, src/styles, src/test).
#
# ESLint and Vitest split cleanly by directory, so lint/test have per-layer
# targets. Prettier and tsc are inherently whole-repo/whole-project, so the
# format check and typecheck run once under lint-frontend and cover both layers.

FRONTEND := frontend

.PHONY: help
help:
	@grep -E '^\.PHONY: .*?## .*$$' $(MAKEFILE_LIST) | \
		sort | \
		awk 'BEGIN {FS = ".PHONY: |## "}; {printf "\033[36m%-15s\033[0m %s\n", $$2, $$3}'

# Install on demand, only when node_modules is absent (a fresh clone), so the
# quality gates can depend on deps being present without reinstalling every run.
# Run `make install` explicitly to pick up dependency changes.
$(FRONTEND)/node_modules:
	cd $(FRONTEND) && npm ci
	@touch $@

.PHONY: install ## Install dependencies
install:
	cd $(FRONTEND) && npm install

.PHONY: lintable ## Auto-fix lint and format across the app
lintable: | $(FRONTEND)/node_modules
	cd $(FRONTEND) && npm run lint:fix
	cd $(FRONTEND) && npm run format

.PHONY: lint ## Run all lint checks (backend + frontend)
lint: lint-backend lint-frontend

.PHONY: lint-backend ## Lint + format-check the BFF/server layer only
lint-backend: | $(FRONTEND)/node_modules
	cd $(FRONTEND) && npm run lint:backend
	cd $(FRONTEND) && npm run format:backend

.PHONY: lint-frontend ## Lint the UI, then whole-repo format-check + typecheck
lint-frontend: | $(FRONTEND)/node_modules
	cd $(FRONTEND) && npm run lint:frontend
	cd $(FRONTEND) && npm run format:check
	cd $(FRONTEND) && npm run typecheck

.PHONY: typecheck ## Type-check the whole app (tsc --noEmit)
typecheck: | $(FRONTEND)/node_modules
	cd $(FRONTEND) && npm run typecheck

.PHONY: test ## Run all tests (backend + frontend)
test: test-backend test-frontend

.PHONY: test-backend ## Run BFF/server tests only
test-backend: | $(FRONTEND)/node_modules
	cd $(FRONTEND) && npm run test:backend

.PHONY: test-frontend ## Run UI tests only
test-frontend: | $(FRONTEND)/node_modules
	cd $(FRONTEND) && npm run test:frontend

.PHONY: coverage ## Whole-app test coverage report
coverage: | $(FRONTEND)/node_modules
	cd $(FRONTEND) && npm run test:coverage

.PHONY: check ## Full quality gate: lint + test
check: lint test

.PHONY: dev ## Run the app (UI + BFF) on :3000
dev:
	cd $(FRONTEND) && npm run dev

.PHONY: build ## Production build (Next standalone output)
build:
	cd $(FRONTEND) && npm run build

.PHONY: start ## Run the production server
start:
	cd $(FRONTEND) && npm run start

.PHONY: docker ## Build the single app image
docker:
	docker build -f docker/Dockerfile -t arc-platform:latest .

.PHONY: up ## Run the app via docker compose on :3000 (set deploy/.env first)
up:
	cd deploy && docker compose up --build -d

.PHONY: down ## Stop the docker compose app
down:
	cd deploy && docker compose down

.PHONY: clean ## Remove build artifacts
clean:
	rm -rf $(FRONTEND)/.next $(FRONTEND)/coverage
