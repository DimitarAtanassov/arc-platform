import { describe, expect, it } from "vitest";

import rawPayload from "./__fixtures__/generation-params.generated.json";
import { GENERATION_KNOB_FIELDS } from "./generation-knobs";
import {
  buildGenerationConfigSchema,
  generationParamsSchema,
  type GenerationParamSpec,
} from "./schemas";
import { toGenerationParams } from "@/server/model-lab/mappers";

/**
 * Contract drift guard (spec 0001 §4.3). The comparison fixture is CI-generated
 * from the lab's `GET /generation/params` payload by
 * `scripts/generate-generation-params-fixture.mjs`, never hand-curated, so the
 * only thing the Zod mirror is compared against is the lab's actual registry. If
 * a bound moves in the lab and the mirror in `schemas.ts` has not tracked it, the
 * regenerated fixture and the mirror disagree and this fails CI before a user
 * hits a false-valid control.
 *
 * The payload exposes each knob's static numeric bounds and the effective
 * `max_output_tokens` cap, which is what this test drift-checks. The `stop` knob's
 * item-count and per-item-length bounds are registry constants the lab does not
 * surface in this payload, so they are covered by shape, not by numeric drift.
 */

const registry = generationParamsSchema.parse(
  toGenerationParams(rawPayload as Record<string, unknown>),
);
const config = buildGenerationConfigSchema(registry.maxOutputTokensCap);

const camelBySnake = new Map<string, string>(
  GENERATION_KNOB_FIELDS.map(([camel, snake]) => [snake, camel]),
);

/** Parse a single-knob config object; the mirror's fields are independent. */
function accepts(field: string, value: unknown): boolean {
  return config.safeParse({ [field]: value }).success;
}

describe("generation params contract", () => {
  it("mirrors exactly the registry knobs (no missing, no stale)", () => {
    const registryNames = registry.params.map((p) => p.name).sort();
    const mirrorNames = GENERATION_KNOB_FIELDS.map(([, snake]) => snake).sort();
    expect(mirrorNames).toEqual(registryNames);
  });

  it.each(registry.params.map((param) => [param.name, param] as const))(
    "mirrors the bounds for %s",
    (_name, param: GenerationParamSpec) => {
      const field = camelBySnake.get(param.name);
      expect(field).toBeDefined();
      if (field === undefined) {
        return;
      }

      // max_output_tokens has no static maximum: its ceiling is the runtime cap
      // reported in the payload, which the mirror must enforce, not hardcode.
      if (param.name === "max_output_tokens") {
        const cap = registry.maxOutputTokensCap;
        expect(accepts(field, param.minimum ?? 1)).toBe(true);
        expect(accepts(field, (param.minimum ?? 1) - 1)).toBe(false);
        expect(accepts(field, cap)).toBe(true);
        expect(accepts(field, cap + 1)).toBe(false);
        return;
      }

      if (param.kind === "bool") {
        expect(accepts(field, true)).toBe(true);
        expect(accepts(field, false)).toBe(true);
        expect(accepts(field, "nope")).toBe(false);
        return;
      }

      if (param.kind === "str_list") {
        expect(accepts(field, ["a"])).toBe(true);
        expect(accepts(field, [123])).toBe(false);
        return;
      }

      const step = param.kind === "int" ? 1 : 1e-6;
      if (param.minimum != null) {
        expect(accepts(field, param.minimum)).toBe(true);
        expect(accepts(field, param.minimum - step)).toBe(false);
      }
      if (param.maximum != null) {
        expect(accepts(field, param.maximum)).toBe(true);
        expect(accepts(field, param.maximum + step)).toBe(false);
      }
    },
  );
});
