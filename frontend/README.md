# ARC Research Console — Frontend

Audience: ARC platform and frontend engineers. Reading time: 5 minutes.

The Next.js App Router UI for the ARC Research Console. It renders two real
capabilities, models and inference, and talks only to the FastAPI BFF. It holds
no data of its own and never calls arc-model-lab directly.

The design is a dark-first research instrument: calm, precise, table-friendly,
dense on demand, keyboard-friendly. No gradients, no decorative art, no fake
analytics. Future surfaces exist only as honest, disabled placeholders until a
backend capability exists.

## Stack

| Concern         | Choice                                                     |
| --------------- | ---------------------------------------------------------- |
| Framework       | Next.js 15 (App Router), React 19, TypeScript 5.7          |
| Styling         | Tailwind CSS v4 (CSS-first `@theme`), CSS tokens           |
| Primitives      | Radix UI (Slot, Tooltip, Dialog), class-variance-authority |
| Server state    | TanStack Query                                             |
| Tables          | TanStack Table                                             |
| Validation      | Zod (response schemas at the boundary)                     |
| Theming         | next-themes (dark default, light peer)                     |
| Icons           | lucide-react                                               |
| Fonts           | Inter (UI), JetBrains Mono (IDs, code, metrics)            |
| Testing         | Vitest, React Testing Library, jsdom                       |
| Lint and format | ESLint (next/core-web-vitals), Prettier                    |

## Structure

```text
frontend/
  src/
    app/                     # App Router routes
      layout.tsx             # fonts, providers, shell, no-flash density script
      page.tsx               # Overview (honest orientation, no fake metrics)
      models/                # /models (table) and /models/[modelId] (detail)
      lab/                   # /lab inference workbench
      inference/             # /inference (history) and /inference/[inferenceId] (detail)
      error.tsx  not-found.tsx  loading.tsx
    components/
      layout/                # AppShell, Sidebar, Topbar, PageHeader
      ui/                    # Button, Badge, Panel, DataTable, Drawer, Input, Textarea, ...
      providers.tsx          # Preferences + Query + Tooltip providers
      query-provider.tsx     # TanStack Query client
    features/
      models/                # ModelsTable, ModelDetailView, columns, status badge
      inference/             # InferenceLab, InferenceHistoryTable, InferenceDetailView, columns
    lib/
      api/                   # Zod schemas, typed fetch client, query hooks
      preferences/           # theme (next-themes) + density + sidebar, persisted
      format.ts              # UTC-stable date/number formatters
      nav.ts                 # navigation IA: real routes + planned (disabled) group
      utils.ts               # cn() class composer
    styles/
      tokens.css             # design tokens (two themes + density)
      globals.css            # Tailwind entry + @theme mapping + base layer
    test/                    # render helper (providers + query client)
```

## Design system

Tokens live in [src/styles/tokens.css](src/styles/tokens.css) as CSS variables
and are mapped onto Tailwind color utilities in
[src/styles/globals.css](src/styles/globals.css) via `@theme inline`, so
`bg-surface`, `text-text-muted`, or `border-border` resolve to the live variable
and switch with the theme.

- Themes. Dark is the default and the SSR baseline; light is a first-class peer.
  next-themes owns the `data-theme` attribute and its own pre-paint script.
- Density. `comfortable` (default) and `compact` rescale data-surface spacing
  through `--row-pad-y`, `--cell-pad-x`, `--control-h`, and `--gap`. A pre-paint
  script applies the stored density before hydration to avoid a flash.
- Semantic tokens. `background`, `surface`, `surface-raised`, `surface-subtle`,
  `border`, `border-strong`, `text`, `text-muted`, `text-faint`, `accent`,
  `accent-muted`, `success`, `warning`, `danger`, `info`, `code`, `focus`.
- Focus. One signature across the app: a two-step ring in the accent hue on
  `:focus-visible` only, so pointer users see no ring.

## Data and server state

The browser calls only the BFF. The data layer lives in
[src/lib/api](src/lib/api):

- `schemas.ts` defines Zod schemas for the BFF's camelCase contract. Responses
  are validated at the boundary, and the inferred types are the single source of
  truth for feature code.
- `client.ts` is the one HTTP entry point. It reads `NEXT_PUBLIC_API_BASE`,
  validates every response, and turns failures into a typed `ApiError` carrying
  the BFF's `{detail, code}` envelope.
- `queries.ts` holds the TanStack Query hooks and key factories
  (`useModels`, `useModel`, `useModelInferences`), plus the `useRunInference`
  mutation the lab uses to POST a run.

Data fetching is client-side: route `page.tsx` files stay server components (for
metadata) and render a `"use client"` feature view that owns the query. Tables
are built on the shared `DataTable` (TanStack Table); filtering is done in the
feature and sorting in the table.

## Commands

```bash
npm run dev          # dev server on :3000
npm run build        # production build
npm run test         # Vitest (unit + component)
npm run typecheck    # tsc --noEmit (strict)
npm run lint         # next lint (eslint)
npm run format       # prettier --write
```

From the repo root, the same gates are available as Make targets: `web.dev`,
`web.build`, `web.test`, `web.typecheck`, `web.lint`, and `web.check` (lint plus
typecheck plus tests). See the root [Makefile](../Makefile).

## Conventions

- The browser calls only the BFF. Set `NEXT_PUBLIC_API_BASE` (see
  [.env.local.example](.env.local.example)); data wiring arrives in later phases.
- The BFF contract is camelCase. Server and client boundaries follow App Router
  rules: components are server by default, and files that use hooks, browser
  APIs, or event handlers declare `"use client"`.
- UI primitives are intent-based, not decorative. There is one primary action
  color (the amber accent), used sparingly.
- Every route renders a `PageHeader`, and unbuilt surfaces render an honest
  `EmptyState` rather than placeholder charts.

## Testing

Vitest runs in jsdom. Component tests use React Testing Library and query by
role and accessible name. `next/navigation` and `next/link` are mocked where a
component depends on the Next runtime. Setup
([vitest.setup.ts](vitest.setup.ts)) installs jsdom shims (matchMedia,
ResizeObserver, localStorage) so preference and Radix behavior stay
deterministic.
