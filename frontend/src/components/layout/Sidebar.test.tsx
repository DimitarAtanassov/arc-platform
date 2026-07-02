import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// Mark "/models" active and stub next/link with a plain anchor so the sidebar
// can render outside the Next runtime.
vi.mock("next/navigation", () => ({
  usePathname: () => "/models",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { Sidebar } from "./Sidebar";

function renderSidebar() {
  return render(
    <Sidebar collapsed={false} mobileOpen={false} onDismiss={vi.fn()} />,
  );
}

describe("Sidebar", () => {
  it("renders the real capabilities as navigable links", () => {
    renderSidebar();
    for (const label of ["Overview", "Models", "Inference Lab", "History"]) {
      expect(
        screen.getByRole("link", { name: new RegExp(label) }),
      ).toBeInTheDocument();
    }
  });

  it("marks the active route with aria-current=page", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /Models/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /Overview/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("renders planned surfaces as non-links marked Planned", () => {
    renderSidebar();
    // Datasets is planned: present as text, but never a link.
    expect(screen.getByText("Datasets")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Datasets/ })).toBeNull();
    expect(screen.getAllByText("Planned").length).toBeGreaterThan(0);
  });
});
