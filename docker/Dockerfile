# syntax=docker/dockerfile:1
# ARC Research Console — one image. The Next.js server serves the UI and is the
# BFF (Route Handlers under /api). It reaches arc-model-lab via MODEL_LAB_URL,
# supplied at runtime and never shipped to the browser bundle.
#
# Build from the repo root:  docker build -f docker/Dockerfile -t arc-platform .

FROM node:20-slim AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
# Next standalone output: a minimal server bundle plus the static assets.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
