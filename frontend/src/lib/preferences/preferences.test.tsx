import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PreferencesProvider, useUIPreferences } from "./index";

function DensityHarness() {
  const { density, toggleDensity } = useUIPreferences();
  return (
    <button type="button" onClick={toggleDensity}>
      density:{density}
    </button>
  );
}

describe("PreferencesProvider", () => {
  it("defaults to comfortable and reflects a density toggle onto the document", async () => {
    render(
      <PreferencesProvider>
        <DensityHarness />
      </PreferencesProvider>,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("density:comfortable");

    await userEvent.click(button);

    expect(button).toHaveTextContent("density:compact");
    expect(document.documentElement.getAttribute("data-density")).toBe(
      "compact",
    );
    expect(window.localStorage.getItem("arc.density")).toBe("compact");
  });
});

describe("useUIPreferences", () => {
  it("throws when used outside the provider", () => {
    function Orphan() {
      useUIPreferences();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(/PreferencesProvider/);
  });
});
