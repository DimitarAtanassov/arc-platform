import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
  it("renders a button that defaults to type=button", () => {
    render(<Button>Run</Button>);
    expect(screen.getByRole("button", { name: "Run" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("carries the accent fill on the primary variant", () => {
    render(<Button variant="primary">Go</Button>);
    expect(screen.getByRole("button", { name: "Go" }).className).toContain(
      "bg-accent",
    );
  });

  it("invokes onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Tap</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Tap" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not invoke onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Nope
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Nope" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders the child element when asChild is set", () => {
    render(
      <Button asChild variant="primary">
        <a href="https://example.com/docs">Open</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Open" });
    expect(link).toHaveAttribute("href", "https://example.com/docs");
    // Inherits the button styling via Slot.
    expect(link.className).toContain("inline-flex");
  });
});
