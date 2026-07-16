import type { GenerationConfig } from "@/lib/api/schemas";

/**
 * Pure decoding-mode logic shared by the tuning panel and its tests. The lab is
 * the authority on illegal combinations (it 422s them, see spec 0001 §1.3); this
 * mirrors just enough of that rule set to disable controls the lab would reject,
 * so the UI steers the user away from a doomed run without ever deciding validity.
 *
 * Mode drivers: `numBeams > 1` is beam search; `doSample === true` (with one beam)
 * is sampling; anything else is greedy. Beam search cannot combine with sampling,
 * and beam-only knobs are meaningless outside beam search.
 */

/** Sampling value knobs: only meaningful when sampling is actually on. */
export const SAMPLING_KNOBS = [
  "temperature",
  "topP",
  "topK",
  "minP",
] as const satisfies ReadonlyArray<keyof GenerationConfig>;

/** Beam-only knobs: only meaningful under beam search (`numBeams > 1`). */
export const BEAM_ONLY_KNOBS = [
  "lengthPenalty",
  "earlyStopping",
] as const satisfies ReadonlyArray<keyof GenerationConfig>;

export function isBeamSearch(config: GenerationConfig): boolean {
  return (config.numBeams ?? 1) > 1;
}

/** `do_sample` is offered unless beam search is on (beam + sampling is a 422). */
function isSampleToggleEnabled(config: GenerationConfig): boolean {
  return !isBeamSearch(config);
}

/** Sampling value knobs are offered only with sampling explicitly on, one beam. */
function isSamplingKnobEnabled(config: GenerationConfig): boolean {
  return !isBeamSearch(config) && config.doSample === true;
}

/**
 * Whether the control for one camelCase knob should be interactive given the
 * current config. Non-mode knobs (length, repetition, determinism, stopping) are
 * always available.
 */
export function isKnobEnabled(
  camelName: string,
  config: GenerationConfig,
): boolean {
  if (camelName === "doSample") {
    return isSampleToggleEnabled(config);
  }
  if ((SAMPLING_KNOBS as readonly string[]).includes(camelName)) {
    return isSamplingKnobEnabled(config);
  }
  if ((BEAM_ONLY_KNOBS as readonly string[]).includes(camelName)) {
    return isBeamSearch(config);
  }
  return true;
}

/**
 * Drop any knob the current mode disables, so the config the UI holds and sends
 * never carries a combination the lab would 422. Called after every edit, so
 * flipping to beam search clears sampling, and dropping back to one beam clears
 * beam-only knobs. Idempotent.
 */
export function normalizeConfig(config: GenerationConfig): GenerationConfig {
  const next: GenerationConfig = { ...config };
  const beam = isBeamSearch(next);

  if (beam) {
    delete next.doSample;
  }
  if (beam || next.doSample !== true) {
    for (const knob of SAMPLING_KNOBS) {
      delete next[knob];
    }
  }
  if (!beam) {
    for (const knob of BEAM_ONLY_KNOBS) {
      delete next[knob];
    }
  }
  return next;
}

/** Turn a snake_case registry name into a control label ("Max output tokens"). */
export function humanizeKnob(snakeName: string): string {
  const spaced = snakeName.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Structural equality of two configs, for the "preset loaded unmodified" check. */
export function configsEqual(
  a: GenerationConfig,
  b: GenerationConfig,
): boolean {
  const norm = (c: GenerationConfig): string => {
    const entries = Object.entries(c)
      .filter(([, value]) => value !== undefined)
      .sort(([x], [y]) => x.localeCompare(y));
    return JSON.stringify(entries);
  };
  return norm(a) === norm(b);
}
