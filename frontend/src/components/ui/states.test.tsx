import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";

describe("EmptyState", () => {
  it("renders the title, description and action", () => {
    render(
      <EmptyState
        title="No models"
        description="The catalog is empty"
        action={<button type="button">Refresh</button>}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "No models" }),
    ).toBeInTheDocument();
    expect(screen.getByText("The catalog is empty")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("is announced as an alert and runs the retry handler", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} detail="upstream_error" />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("upstream_error")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("omits the retry control when no handler is provided", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("LoadingState", () => {
  it("exposes a single busy status region with its label", () => {
    render(<LoadingState label="Fetching models" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Fetching models");
  });
});
