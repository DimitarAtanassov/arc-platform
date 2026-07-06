/**
 * Clamp a caller-supplied `limit` query parameter to a bounded page size. Keeps
 * list endpoints from ever requesting an unbounded collection from a backend.
 */
export function clampLimit(raw: string | null, fallback = 50, max = 200): number {
  const value = Number(raw ?? fallback);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(1, Math.trunc(value)));
}
