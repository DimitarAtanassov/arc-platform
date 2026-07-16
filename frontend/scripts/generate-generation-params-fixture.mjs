#!/usr/bin/env node
// @ts-check
/**
 * Regenerate the generation-params contract fixture from the lab's live
 * `GET /generation/params` payload. The fixture is machine-generated, never
 * hand-curated: the contract drift test compares the Zod mirror in
 * `lib/api/schemas.ts` against this fixture, so a hand-maintained fixture would
 * drift in lockstep with a stale mirror and let the test pass falsely (spec 0001
 * §4.3). CI runs this against a running (or pinned) lab, then runs the test.
 *
 *   MODEL_LAB_URL=http://localhost:8000 node scripts/generate-generation-params-fixture.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(
  HERE,
  "..",
  "src",
  "lib",
  "api",
  "__fixtures__",
  "generation-params.generated.json",
);

const baseUrl = (process.env.MODEL_LAB_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

async function main() {
  const url = `${baseUrl}/generation/params`;
  let response;
  try {
    response = await fetch(url, { headers: { accept: "application/json" } });
  } catch (error) {
    throw new Error(`could not reach the lab at ${url}: ${String(error)}`);
  }
  if (!response.ok) {
    throw new Error(`lab returned ${response.status} for ${url}`);
  }
  const payload = await response.json();
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  process.stdout.write(`wrote ${OUT}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
