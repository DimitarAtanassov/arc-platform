import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders an h1 title with the eyebrow, description and actions", () => {
    render(
      <PageHeader
        eyebrow="Console"
        title="Models"
        description="Browse the catalog"
        actions={<button type="button">New</button>}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Models" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Console")).toBeInTheDocument();
    expect(screen.getByText("Browse the catalog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();
  });

  it("omits optional regions when not provided", () => {
    render(<PageHeader title="Overview" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Overview" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
