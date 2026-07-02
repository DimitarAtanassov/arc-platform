import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders its label", () => {
    render(<Badge>Available</Badge>);
    expect(screen.getByText("Available")).toBeInTheDocument();
  });

  it("maps tone onto the semantic color", () => {
    render(<Badge tone="success">Succeeded</Badge>);
    expect(screen.getByText("Succeeded")).toHaveClass("text-success");
  });

  it("renders a decorative status dot when requested", () => {
    const { container } = render(
      <Badge tone="danger" dot>
        Failed
      </Badge>,
    );
    const dot = container.querySelector("span[aria-hidden]");
    expect(dot).not.toBeNull();
  });
});
