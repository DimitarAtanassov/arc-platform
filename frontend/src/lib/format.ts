/**
 * Deterministic, UTC-stable formatters. The console values precision over
 * locale-friendliness: timestamps render in UTC so they read the same for every
 * engineer and stay stable in tests. Absent values render as an em dash.
 */

const EMPTY = "\u2014";

function toDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** ISO date only: `2024-08-06`. */
export function formatDate(value: string | null | undefined): string {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : EMPTY;
}

/** Compact UTC timestamp: `2024-08-06 14:30 UTC`. */
export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) {
    return EMPTY;
  }
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/** Thousands-separated integer, or an em dash when absent. */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return EMPTY;
  }
  return new Intl.NumberFormat("en-US").format(value);
}

/** Milliseconds with one decimal: `812.5 ms`. */
export function formatLatency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return EMPTY;
  }
  return `${value.toFixed(1)} ms`;
}

/** A 0..1 score as a percentage: `0.82` -> `82%`. */
export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return EMPTY;
  }
  return `${Math.round(value * 100)}%`;
}

export { EMPTY as EMPTY_VALUE };
