.DEFAULT_GOAL := help

# ARC Research Console — a single Next.js app that serves the UI and is the BFF
# (Route Handlers under /api) over arc-model-lab. One language, one image.

.PHONY: help
help:
	@grep -E '^\.PHONY: .*?## .*$$' $(MAKEFILE_LIST) | \
		sort | \
		awk 'BEGIN {FS = ".PHONY: |## "}; {printf "\033[36m%-12s\033[0m %s\n", $$2, $$3}'

.PHONY: install ## Install dependencies
install:
	cd frontend && npm install

.PHONY: dev ## Run the app (UI + BFF) on :3000
dev:
	cd frontend && npm run dev

.PHONY: build ## Production build (Next standalone output)
build:
	cd frontend && npm run build

.PHONY: start ## Run the production server
start:
	cd frontend && npm run start

.PHONY: test ## Run tests (Vitest: UI + server BFF)
test:
	cd frontend && npm test

.PHONY: typecheck ## Type-check (tsc --noEmit)
typecheck:
	cd frontend && npm run typecheck

.PHONY: lint ## Lint + format check (next lint + prettier)
lint:
	cd frontend && npm run lint && npm run format:check

.PHONY: check ## Full quality gate: lint + typecheck + tests
check: lint typecheck test

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
	rm -rf frontend/.next frontend/coverage
