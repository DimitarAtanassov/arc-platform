import { screen, within } from "@testing-library/react";
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
    getInferences: vi.fn(),
    getModels: vi.fn(),
  };
});

import { getInferences, getModels } from "@/lib/api/client";
import type { InferenceSummary, ModelSummary } from "@/lib/api/schemas";
import { renderWithProviders } from "@/test/render";

import { InferenceHistoryTable } from "./InferenceHistoryTable";

const MODELS: ModelSummary[] = [
  {
    modelId: "gpt-4o",
    displayName: "GPT-4o",
    provider: "openai",
    status: "available",
    modalities: [],
  },
  {
    modelId: "claude-sonnet-4",
    displayName: "Claude Sonnet 4",
    provider: "anthropic",
    status: "available",
    modalities: [],
  },
];

const INFERENCES: InferenceSummary[] = [
  {
    inferenceId: "inf-1",
    modelId: "gpt-4o",
    status: "succeeded",
    createdAt: "2026-07-01T12:00:00Z",
    latencyMs: 812.5,
    totalTokens: 30,
    promptPreview: "Say hello",
  },
  {
    inferenceId: "inf-2",
    modelId: "claude-sonnet-4",
    status: "failed",
    createdAt: "2026-07-01T11:00:00Z",
    latencyMs: 220,
    totalTokens: null,
    promptPreview: "Explain relativity",
  },
];

beforeEach(() => {
  pushMock.mockClear();
  vi.mocked(getInferences).mockReset();
  vi.mocked(getModels).mockReset();
  vi.mocked(getModels).mockResolvedValue(MODELS);
  vi.mocked(getInferences).mockResolvedValue(INFERENCES);
});

describe("InferenceHistoryTable", () => {
  it("shows a loading state, then rows", async () => {
    let resolve: (value: InferenceSummary[]) => void = () => {};
    vi.mocked(getInferences).mockReturnValue(
      new Promise<InferenceSummary[]>((r) => {
        resolve = r;
      }),
    );
    renderWithProviders(<InferenceHistoryTable />);

    expect(
      screen.getByRole("table", { name: "Inference history" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "inf-1" })).toBeNull();

    resolve(INFERENCES);
    expect(
      await screen.findByRole("link", { name: "inf-1" }),
    ).toBeInTheDocument();
  });

  it("renders a row per persisted record with model names", async () => {
    renderWithProviders(<InferenceHistoryTable />);
    expect(
      await screen.findByRole("link", { name: "inf-1" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "inf-2" })).toBeInTheDocument();
    // Scope to the table so the model-filter options do not also match.
    const table = screen.getByRole("table", { name: "Inference history" });
    expect(within(table).getByText("GPT-4o")).toBeInTheDocument();
    expect(within(table).getByText("Claude Sonnet 4")).toBeInTheDocument();
  });

  it("filters by search text (ID or model name)", async () => {
    renderWithProviders(<InferenceHistoryTable />);
    await screen.findByRole("link", { name: "inf-1" });

    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search inferences" }),
      "claude",
    );

    expect(screen.queryByRole("link", { name: "inf-1" })).toBeNull();
    expect(screen.getByRole("link", { name: "inf-2" })).toBeInTheDocument();
  });

  it("filters by model", async () => {
    renderWithProviders(<InferenceHistoryTable />);
    await screen.findByRole("link", { name: "inf-1" });

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Filter by model" }),
      "gpt-4o",
    );

    expect(screen.getByRole("link", { name: "inf-1" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "inf-2" })).toBeNull();
  });

  it("shows an empty state when there is no history", async () => {
    vi.mocked(getInferences).mockResolvedValue([]);
    renderWithProviders(<InferenceHistoryTable />);
    expect(await screen.findByText("No inferences yet")).toBeInTheDocument();
  });

  it("shows an error state when the fetch fails", async () => {
    vi.mocked(getInferences).mockRejectedValue(new Error("history boom"));
    renderWithProviders(<InferenceHistoryTable />);
    expect(
      await screen.findByText("Could not load inference history"),
    ).toBeInTheDocument();
    expect(screen.getByText("history boom")).toBeInTheDocument();
  });

  it("opens the detail route on row click", async () => {
    renderWithProviders(<InferenceHistoryTable />);
    await screen.findByRole("link", { name: "inf-1" });

    // Click a non-link cell (the prompt preview) to trigger row navigation.
    await userEvent.click(screen.getByText("Say hello"));
    expect(pushMock).toHaveBeenCalledWith("/inference/inf-1");
  });
});
