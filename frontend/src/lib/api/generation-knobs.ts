/**
 * The decoding-knob field map: the BFF's camelCase name paired with the lab's
 * snake_case name, one entry per knob in arc-model-lab's parameter registry
 * (spec 0001 §1.2). It is the single home for the camelCase<->snake_case knob
 * mapping, consumed by the server mappers (both directions) and by the contract
 * drift test that mirrors the registry. Pure, with no `server-only` import, so it
 * stays importable from tests and the browser contract alike.
 */
export const GENERATION_KNOB_FIELDS = [
  ["maxOutputTokens", "max_output_tokens"],
  ["minNewTokens", "min_new_tokens"],
  ["doSample", "do_sample"],
  ["temperature", "temperature"],
  ["topP", "top_p"],
  ["topK", "top_k"],
  ["minP", "min_p"],
  ["repetitionPenalty", "repetition_penalty"],
  ["noRepeatNgramSize", "no_repeat_ngram_size"],
  ["numBeams", "num_beams"],
  ["lengthPenalty", "length_penalty"],
  ["earlyStopping", "early_stopping"],
  ["seed", "seed"],
  ["stop", "stop"],
] as const satisfies ReadonlyArray<readonly [camel: string, snake: string]>;
