"use client";

import { useId, useMemo } from "react";

import { Badge, Button, Input } from "@/components/ui";
import { GENERATION_KNOB_FIELDS } from "@/lib/api/generation-knobs";
import {
  buildGenerationConfigSchema,
  type GenerationConfig,
  type GenerationParams,
  type GenerationParamSpec,
} from "@/lib/api/schemas";

import { humanizeKnob, isKnobEnabled } from "./tuning";

const SNAKE_TO_CAMEL = new Map<string, string>(
  GENERATION_KNOB_FIELDS.map(([camel, snake]) => [snake, camel]),
);

interface TuningPanelProps {
  params: GenerationParams;
  config: GenerationConfig;
  onChange: (config: GenerationConfig) => void;
  disabled?: boolean;
}

/**
 * Renders one decoding control per registry knob from `GET /generation/params`,
 * so a new knob in the lab appears here with no UI change (spec 0001 §4.4).
 * Core-tier knobs show by default; advanced-tier hide behind a disclosure. Each
 * control is bounded to the registry, and mode-conflicting controls disable to
 * steer away from a combination the lab would 422. The server stays the authority.
 */
export function TuningPanel({
  params,
  config,
  onChange,
  disabled = false,
}: TuningPanelProps) {
  const configSchema = useMemo(
    () => buildGenerationConfigSchema(params.maxOutputTokensCap),
    [params.maxOutputTokensCap],
  );

  const core = params.params.filter((p) => p.tier === "core");
  const advanced = params.params.filter((p) => p.tier === "advanced");

  function renderKnob(spec: GenerationParamSpec) {
    const camel = SNAKE_TO_CAMEL.get(spec.name);
    if (camel === undefined) {
      return null;
    }
    return (
      <KnobControl
        key={spec.name}
        spec={spec}
        camelName={camel}
        value={(config as Record<string, unknown>)[camel]}
        cap={params.maxOutputTokensCap}
        disabled={disabled || !isKnobEnabled(camel, config)}
        error={fieldError(configSchema, camel, config)}
        onValue={(value) => {
          const next: Record<string, unknown> = { ...config };
          if (value === undefined) {
            delete next[camel];
          } else {
            next[camel] = value;
          }
          onChange(next as GenerationConfig);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="Core decoding parameters"
        className="space-y-3"
      >
        {core.map(renderKnob)}
      </div>

      {advanced.length > 0 ? (
        <details className="rounded-md border border-border">
          <summary className="cursor-pointer select-none px-3 py-2 text-[13px] font-medium text-text-muted">
            Advanced parameters
          </summary>
          <div
            role="group"
            aria-label="Advanced decoding parameters"
            className="space-y-3 border-t border-border p-3"
          >
            {advanced.map(renderKnob)}
          </div>
        </details>
      ) : null}
    </div>
  );
}

interface KnobControlProps {
  spec: GenerationParamSpec;
  camelName: string;
  value: unknown;
  cap: number;
  disabled: boolean;
  error: string | null;
  onValue: (value: number | boolean | string[] | undefined) => void;
}

function KnobControl({
  spec,
  camelName,
  value,
  cap,
  disabled,
  error,
  onValue,
}: KnobControlProps) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const label = humanizeKnob(spec.name);

  if (spec.kind === "bool") {
    return (
      <div className="flex items-center gap-2">
        <input
          id={fieldId}
          type="checkbox"
          checked={value === true}
          disabled={disabled}
          onChange={(event) => onValue(event.target.checked ? true : undefined)}
          className="size-4 rounded border-border accent-[var(--accent)] disabled:opacity-50"
        />
        <label
          htmlFor={fieldId}
          className="text-[13px] font-medium text-text-muted"
        >
          {label}
        </label>
      </div>
    );
  }

  if (spec.kind === "str_list") {
    return (
      <StopInput
        id={fieldId}
        label={label}
        value={Array.isArray(value) ? (value as string[]) : []}
        disabled={disabled}
        error={error}
        onChange={(next) => onValue(next.length === 0 ? undefined : next)}
      />
    );
  }

  // int / float: a bounded number field. max_output_tokens has no static ceiling;
  // its bound is the effective runtime cap reported in the payload.
  const max = spec.name === "max_output_tokens" ? cap : (spec.maximum ?? undefined);
  const min = spec.minimum ?? undefined;
  const stringValue = typeof value === "number" ? String(value) : "";

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={fieldId}
        className="block text-[13px] font-medium text-text-muted"
      >
        {label}
        <span className="ml-1 text-text-faint">
          {rangeHint(min, max)}
        </span>
      </label>
      <Input
        id={fieldId}
        type="number"
        inputMode={spec.kind === "int" ? "numeric" : "decimal"}
        min={min}
        max={max}
        step={spec.kind === "int" ? 1 : "any"}
        value={stringValue}
        disabled={disabled}
        aria-invalid={error !== null}
        aria-describedby={error !== null ? errorId : undefined}
        placeholder="Server default"
        className="max-w-48"
        onChange={(event) => {
          const raw = event.target.value;
          if (raw.trim() === "") {
            onValue(undefined);
            return;
          }
          const parsed = Number(raw);
          onValue(Number.isNaN(parsed) ? undefined : parsed);
        }}
      />
      {error !== null ? (
        <p id={errorId} role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface StopInputProps {
  id: string;
  label: string;
  value: string[];
  disabled: boolean;
  error: string | null;
  onChange: (value: string[]) => void;
}

/** A small tag input for `stop` strings: type a token, press Enter to add it. */
function StopInput({
  id,
  label,
  value,
  disabled,
  error,
  onChange,
}: StopInputProps) {
  const errorId = `${id}-error`;
  const atLimit = value.length >= 4;

  function addToken(raw: string) {
    const token = raw.trim();
    if (token === "" || atLimit || value.includes(token)) {
      return;
    }
    onChange([...value, token]);
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[13px] font-medium text-text-muted"
      >
        {label}
        <span className="ml-1 text-text-faint">(up to 4 sequences)</span>
      </label>
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Stop sequences">
          {value.map((token) => (
            <li key={token}>
              <Badge className="gap-1">
                {token}
                <button
                  type="button"
                  aria-label={`Remove stop sequence ${token}`}
                  disabled={disabled}
                  onClick={() => onChange(value.filter((t) => t !== token))}
                  className="text-text-faint hover:text-text"
                >
                  ×
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        id={id}
        type="text"
        maxLength={32}
        disabled={disabled || atLimit}
        aria-invalid={error !== null}
        aria-describedby={error !== null ? errorId : undefined}
        placeholder={atLimit ? "Limit reached" : "Add a stop sequence"}
        className="max-w-64"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            addToken(event.currentTarget.value);
            event.currentTarget.value = "";
          }
        }}
      />
      {error !== null ? (
        <p id={errorId} role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function rangeHint(min: number | undefined, max: number | undefined): string {
  if (min !== undefined && max !== undefined) {
    return `(${min}–${max})`;
  }
  if (min !== undefined) {
    return `(min ${min})`;
  }
  if (max !== undefined) {
    return `(max ${max})`;
  }
  return "";
}

/**
 * Validate one knob's value against the cap-aware Zod mirror, returning a short
 * message when it is out of bounds. Independent per field, matching how the
 * contract test probes single-knob configs.
 */
function fieldError(
  schema: ReturnType<typeof buildGenerationConfigSchema>,
  camelName: string,
  config: GenerationConfig,
): string | null {
  const value = (config as Record<string, unknown>)[camelName];
  if (value === undefined) {
    return null;
  }
  const result = schema.safeParse({ [camelName]: value });
  if (result.success) {
    return null;
  }
  const issue = result.error.issues.find(
    (candidate) => candidate.path[0] === camelName,
  );
  return issue?.message ?? "Out of range";
}
