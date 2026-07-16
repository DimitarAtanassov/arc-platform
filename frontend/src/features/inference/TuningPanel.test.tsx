import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import fixture from "@/lib/api/__fixtures__/generation-params.generated.json";
import {
  generationParamsSchema,
  type GenerationConfig,
  type GenerationParams,
} from "@/lib/api/schemas";
import { toGenerationParams } from "@/server/model-lab/mappers";

import { TuningPanel } from "./TuningPanel";
import { normalizeConfig } from "./tuning";

const PARAMS: GenerationParams = generationParamsSchema.parse(
  toGenerationParams(fixture as Record<string, unknown>),
);

/** A controlled host that normalizes on change, exactly like the real lab does. */
function Harness({ initial = {} }: { initial?: GenerationConfig }) {
  const [config, setConfig] = useState<GenerationConfig>(initial);
  return (
    <TuningPanel
      params={PARAMS}
      config={config}
      onChange={(next) => setConfig(normalizeConfig(next))}
    />
  );
}

describe("TuningPanel", () => {
  it("renders a control per registry knob, core visible and advanced disclosed", () => {
    render(<Harness />);

    // A core knob is directly visible.
    expect(
      screen.getByLabelText(/max output tokens/i),
    ).toBeInTheDocument();

    // Advanced knobs sit behind a disclosure group.
    const advanced = screen.getByRole("group", {
      name: /advanced decoding parameters/i,
    });
    expect(
      within(advanced).getByLabelText(/repetition penalty/i),
    ).toBeInTheDocument();
  });

  it("bounds max_output_tokens by the effective server cap, not a constant", () => {
    render(<Harness />);
    const field = screen.getByLabelText(/max output tokens/i);
    expect(field).toHaveAttribute("max", String(PARAMS.maxOutputTokensCap));
    expect(field).toHaveAttribute("max", "2048");
  });

  it("disables sampling controls until sampling is enabled", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const temperature = screen.getByLabelText(/temperature/i);
    expect(temperature).toBeDisabled();

    await user.click(screen.getByLabelText(/do sample/i));
    expect(screen.getByLabelText(/temperature/i)).toBeEnabled();
  });

  it("disables beam-only controls unless num_beams > 1", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByLabelText(/length penalty/i)).toBeDisabled();

    const beams = screen.getByLabelText(/num beams/i);
    await user.clear(beams);
    await user.type(beams, "3");
    expect(screen.getByLabelText(/length penalty/i)).toBeEnabled();
  });

  it("surfaces a validation error for an out-of-range value", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    // Enable sampling first so the temperature control is interactive.
    await user.click(screen.getByLabelText(/do sample/i));
    const temperature = screen.getByLabelText(/temperature/i);
    await user.type(temperature, "5");

    expect(temperature).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("adds and removes stop sequences with a keyboard", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const stop = screen.getByLabelText(/^stop/i);
    await user.type(stop, "END{Enter}");
    expect(
      screen.getByRole("list", { name: /stop sequences/i }),
    ).toHaveTextContent("END");

    await user.click(
      screen.getByRole("button", { name: /remove stop sequence end/i }),
    );
    expect(
      screen.queryByRole("list", { name: /stop sequences/i }),
    ).not.toBeInTheDocument();
  });
});
