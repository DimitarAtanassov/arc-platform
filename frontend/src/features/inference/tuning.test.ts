import { describe, expect, it } from "vitest";

import type { GenerationConfig } from "@/lib/api/schemas";

import {
  configsEqual,
  humanizeKnob,
  isBeamSearch,
  isKnobEnabled,
  normalizeConfig,
} from "./tuning";

describe("tuning mode logic", () => {
  it("treats num_beams > 1 as beam search", () => {
    expect(isBeamSearch({ numBeams: 3 })).toBe(true);
    expect(isBeamSearch({ numBeams: 1 })).toBe(false);
    expect(isBeamSearch({})).toBe(false);
  });

  it("enables sampling knobs only when sampling is on with one beam", () => {
    const sampling: GenerationConfig = { doSample: true };
    expect(isKnobEnabled("temperature", sampling)).toBe(true);
    expect(isKnobEnabled("topP", sampling)).toBe(true);

    expect(isKnobEnabled("temperature", { doSample: false })).toBe(false);
    expect(isKnobEnabled("temperature", {})).toBe(false);
    expect(isKnobEnabled("temperature", { doSample: true, numBeams: 2 })).toBe(
      false,
    );
  });

  it("enables beam-only knobs only under beam search", () => {
    expect(isKnobEnabled("lengthPenalty", { numBeams: 4 })).toBe(true);
    expect(isKnobEnabled("earlyStopping", { numBeams: 4 })).toBe(true);
    expect(isKnobEnabled("lengthPenalty", { numBeams: 1 })).toBe(false);
  });

  it("disables do_sample under beam search but leaves it otherwise", () => {
    expect(isKnobEnabled("doSample", { numBeams: 2 })).toBe(false);
    expect(isKnobEnabled("doSample", {})).toBe(true);
  });

  it("always enables non-mode knobs", () => {
    expect(isKnobEnabled("maxOutputTokens", { numBeams: 2 })).toBe(true);
    expect(isKnobEnabled("repetitionPenalty", { doSample: false })).toBe(true);
    expect(isKnobEnabled("seed", {})).toBe(true);
  });
});

describe("normalizeConfig", () => {
  it("drops sampling knobs when sampling is off", () => {
    const next = normalizeConfig({ doSample: false, temperature: 0.9, topP: 0.8 });
    expect(next.temperature).toBeUndefined();
    expect(next.topP).toBeUndefined();
  });

  it("drops sampling knobs and do_sample when beam search is on", () => {
    const next = normalizeConfig({
      numBeams: 3,
      doSample: true,
      temperature: 0.7,
      lengthPenalty: 1.2,
    });
    expect(next.doSample).toBeUndefined();
    expect(next.temperature).toBeUndefined();
    // Beam-only knob survives under beam search.
    expect(next.lengthPenalty).toBe(1.2);
  });

  it("drops beam-only knobs outside beam search", () => {
    const next = normalizeConfig({ numBeams: 1, lengthPenalty: 1.5, earlyStopping: true });
    expect(next.lengthPenalty).toBeUndefined();
    expect(next.earlyStopping).toBeUndefined();
  });

  it("keeps sampling knobs when sampling is explicitly on", () => {
    const next = normalizeConfig({ doSample: true, temperature: 0.8, topK: 40 });
    expect(next.temperature).toBe(0.8);
    expect(next.topK).toBe(40);
  });

  it("is idempotent", () => {
    const once = normalizeConfig({ numBeams: 2, temperature: 0.5, lengthPenalty: 1.1 });
    expect(normalizeConfig(once)).toEqual(once);
  });
});

describe("configsEqual", () => {
  it("ignores key order and undefined fields", () => {
    expect(
      configsEqual(
        { temperature: 0.7, topP: 0.9 },
        { topP: 0.9, temperature: 0.7, seed: undefined },
      ),
    ).toBe(true);
  });

  it("detects a changed value", () => {
    expect(configsEqual({ temperature: 0.7 }, { temperature: 0.8 })).toBe(false);
  });
});

describe("humanizeKnob", () => {
  it("turns a snake_case name into a label", () => {
    expect(humanizeKnob("max_output_tokens")).toBe("Max output tokens");
    expect(humanizeKnob("top_p")).toBe("Top p");
  });
});
