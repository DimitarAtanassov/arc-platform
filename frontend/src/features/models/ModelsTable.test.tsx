import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
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

vi.mock("@/lib/api/client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api/client")>(
      "@/lib/api/client",
    );
  return {
    ...actual,
    getModels: vi.fn(),
    getModel: vi.fn(),
    getInferences: vi.fn(),
  };
});

import { getModels } from "@/lib/api/client";
import type { ModelSummary } from "@/lib/api/schemas";
import { renderWithProviders } from "@/test/render";

import { ModelsTable } from "./ModelsTable";

const MODELS: ModelSummary[] = [
  {
    modelId: "gpt-4o",
    displayName: "GPT-4o",
    provider: "openai",
    family: "gpt-4",
    status: "available",
    revision: "2024-08-06",
    tokenizerId: "o200k_base",
    adapterPath: null,
    contextWindow: 128000,
    maxOutputTokens: 16384,
    modalities: ["text", "vision"],
    createdAt: "2024-08-06T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  },
  {
    modelId: "claude-sonnet-4",
    displayName: "Claude Sonnet 4",
    provider: "anthropic",
    family: "claude-4",
    status: "preview",
    revision: "20250219",
    tokenizerId: "claude-v3",
    adapterPath: null,
    contextWindow: 200000,
    maxOutputTokens: 64000,
    modalities: ["text"],
    createdAt: "2025-02-19T00:00:00Z",
    updatedAt: "2025-05-01T00:00:00Z",
  },
];

beforeEach(() => {
  pushMock.mockClear();
  vi.mocked(getModels).mockReset();
});

describe("ModelsTable", () => {
  it("renders a row per model", async () => {
    vi.mocked(getModels).mockResolvedValue(MODELS);
    renderWithProviders(<ModelsTable />);

    expect(
      await screen.findByRole("link", { name: "GPT-4o" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Claude Sonnet 4" }),
    ).toBeInTheDocument();
    // Model IDs render in a monospace cell.
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
    expect(screen.getByText("o200k_base")).toBeInTheDocument();
  });

  it("filters rows by search text", async () => {
    vi.mocked(getModels).mockResolvedValue(MODELS);
    renderWithProviders(<ModelsTable />);
    await screen.findByRole("link", { name: "GPT-4o" });

    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search models" }),
      "claude",
    );

    expect(screen.queryByRole("link", { name: "GPT-4o" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Claude Sonnet 4" }),
    ).toBeInTheDocument();
  });

  it("filters rows by status", async () => {
    vi.mocked(getModels).mockResolvedValue(MODELS);
    renderWithProviders(<ModelsTable />);
    await screen.findByRole("link", { name: "GPT-4o" });

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Filter by status" }),
      "preview",
    );

    expect(screen.queryByRole("link", { name: "GPT-4o" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Claude Sonnet 4" }),
    ).toBeInTheDocument();
  });

  it("shows an empty state when the catalog is empty", async () => {
    vi.mocked(getModels).mockResolvedValue([]);
    renderWithProviders(<ModelsTable />);

    expect(
      await screen.findByText("No models in the catalog"),
    ).toBeInTheDocument();
  });

  it("shows an error state when the fetch fails", async () => {
    vi.mocked(getModels).mockRejectedValue(new Error("upstream boom"));
    renderWithProviders(<ModelsTable />);

    expect(
      await screen.findByText("Could not load models"),
    ).toBeInTheDocument();
    expect(screen.getByText("upstream boom")).toBeInTheDocument();
  });

  it("navigates to the detail route on row click", async () => {
    vi.mocked(getModels).mockResolvedValue(MODELS);
    renderWithProviders(<ModelsTable />);
    await screen.findByRole("link", { name: "GPT-4o" });

    // Click a non-link cell so the whole-row navigation fires.
    await userEvent.click(screen.getByText("openai"));

    expect(pushMock).toHaveBeenCalledWith("/models/gpt-4o");
  });
});
