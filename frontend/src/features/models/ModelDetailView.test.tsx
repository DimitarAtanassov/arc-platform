import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { ApiError, getInferences, getModel } from "@/lib/api/client";
import type { ModelDetail } from "@/lib/api/schemas";
import { renderWithProviders } from "@/test/render";

import { ModelDetailView } from "./ModelDetailView";

const MODEL: ModelDetail = {
  modelId: "gpt-4o",
  displayName: "GPT-4o",
  provider: "openai",
  family: "gpt-4",
  status: "available",
  revision: "2024-08-06",
  tokenizerId: "o200k_base",
  adapterPath: "s3://arc-adapters/gpt-4o/lora-v1",
  contextWindow: 128000,
  maxOutputTokens: 16384,
  modalities: ["text", "vision"],
  createdAt: "2024-08-06T00:00:00Z",
  updatedAt: "2025-01-15T00:00:00Z",
  description: "Flagship multimodal model.",
  runtimeSource: "openai://chat/gpt-4o",
  capabilities: ["chat", "tools", "vision"],
};

beforeEach(() => {
  vi.mocked(getModel).mockReset();
  vi.mocked(getInferences).mockReset();
  vi.mocked(getInferences).mockResolvedValue([]);
});

describe("ModelDetailView", () => {
  it("renders the model metadata", async () => {
    vi.mocked(getModel).mockResolvedValue(MODEL);
    renderWithProviders(<ModelDetailView modelId="gpt-4o" />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "GPT-4o" }),
    ).toBeInTheDocument();
    // Serving metadata is present.
    expect(screen.getByText("openai://chat/gpt-4o")).toBeInTheDocument();
    expect(screen.getByText("o200k_base")).toBeInTheDocument();
    expect(
      screen.getByText("s3://arc-adapters/gpt-4o/lora-v1"),
    ).toBeInTheDocument();
    // Quiet, semantic status badge.
    expect(screen.getByText("Available")).toBeInTheDocument();
  });

  it("opens the raw JSON drawer", async () => {
    vi.mocked(getModel).mockResolvedValue(MODEL);
    renderWithProviders(<ModelDetailView modelId="gpt-4o" />);
    await screen.findByRole("heading", { level: 1, name: "GPT-4o" });

    await userEvent.click(screen.getByRole("button", { name: "Raw JSON" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Raw model JSON")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Model JSON")).toHaveTextContent(
      '"modelId": "gpt-4o"',
    );
  });

  it("shows a not-found error for a 404", async () => {
    vi.mocked(getModel).mockRejectedValue(
      new ApiError("model 'ghost' not found", 404, "not_found"),
    );
    renderWithProviders(<ModelDetailView modelId="ghost" />);

    expect(await screen.findByText("Model not found")).toBeInTheDocument();
  });
});
