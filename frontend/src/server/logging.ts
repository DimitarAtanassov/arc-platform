import "server-only";

/**
 * The BFF's structured logger: one flat JSON object per line to stdout (stderr
 * for errors), where the platform's log agent collects it. Flat by design so
 * every line is greppable by field; nested objects are intentionally disallowed.
 */

type Field = string | number | boolean | null | undefined;
export type LogFields = Record<string, Field>;
type Level = "info" | "warn" | "error";

function emit(level: Level, event: string, fields: LogFields): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  });
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const log = {
  info: (event: string, fields: LogFields = {}): void =>
    emit("info", event, fields),
  warn: (event: string, fields: LogFields = {}): void =>
    emit("warn", event, fields),
  error: (event: string, fields: LogFields = {}): void =>
    emit("error", event, fields),
};
