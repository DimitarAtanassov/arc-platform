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
    getInference: vi.fn(),
    getModels: vi.fn(),
  };
});

import { ApiError, getInference, getModels } from "@/lib/api/client";
import type { InferenceDetail, ModelSummary } from "@/lib/api/schemas";
import { renderWithProviders } from "@/test/render";

import { InferenceDetailView } from "./InferenceDetailView";

const MODELS: ModelSummary[] = [
  {
    modelId: "gpt-4o",
    displayName: "GPT-4o",
    provider: "openai",
    status: "available",
    modalities: [],
  },
];

const RUN: InferenceDetail = {
  inferenceId: "inf-1",
  modelId: "gpt-4o",
  status: "succeeded",
  createdAt: "2026-07-01T12:00:00Z",
  latencyMs: 812.5,
  totalTokens: 30,
  promptPreview: "Say hello",
  prompt: "Say hello to the world",
  systemPrompt: "You are concise.",
  output: "Hello, world!",
  finishReason: "stop",
  params: { temperature: null, maxTokens: null, topP: null },
  usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
  error: null,
};

beforeEach(() => {
  vi.mocked(getInference).mockReset();
  vi.mocked(getModels).mockReset();
  vi.mocked(getModels).mockResolvedValue(MODELS);
  vi.mocked(getInference).mockResolvedValue(RUN);
});

describe("InferenceDetailView", () => {
  it("renders all persisted fields", async () => {
    renderWithProviders(<InferenceDetailView inferenceId="inf-1" />);

    // The record ID is the heading.
    expect(
      await screen.findByRole("heading", { level: 1, name: "inf-1" }),
    ).toBeInTheDocument();

    // Input, rendered prompt (system + user), and output are all shown.
    expect(screen.getByLabelText("Input text")).toHaveTextContent(
      "Say hello to the world",
    );
    const rendered = screen.getByLabelText("Rendered prompt");
    expect(rendered).toHaveTextContent("You are concise.");
    expect(rendered).toHaveTextContent("Say hello to the world");
    expect(screen.getByLabelText("Output text")).toHaveTextContent(
      "Hello, world!",
    );

    // Model metadata, latency, tokens, and created timestamp.
    expect(screen.getByText("(gpt-4o)")).toBeInTheDocument();
    expect(screen.getByText("812.5 ms")).toBeInTheDocument();
    expect(screen.getByText("Prompt tokens")).toBeInTheDocument();
    expect(screen.getByText("Completion tokens")).toBeInTheDocument();
    expect(screen.getByText("2026-07-01 12:00 UTC")).toBeInTheDocument();
  });

  it("opens the raw JSON drawer", async () => {
    renderWithProviders(<InferenceDetailView inferenceId="inf-1" />);
    await screen.findByRole("heading", { level: 1, name: "inf-1" });

    await userEvent.click(screen.getByRole("button", { name: "Raw JSON" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Raw inference JSON")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Inference JSON")).toHaveTextContent(
      '"inferenceId": "inf-1"',
    );
  });

  it("shows honest placeholders for reserved future sections", async () => {
    renderWithProviders(<InferenceDetailView inferenceId="inf-1" />);
    await screen.findByRole("heading", { level: 1, name: "inf-1" });

    for (const label of [
      "Evaluation",
      "Experiment",
      "Prompt version",
      "Dataset inclusion",
      "Trace link",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getAllByText("Not available yet")).toHaveLength(5);
  });

  it("shows a not-found error for a 404", async () => {
    vi.mocked(getInference).mockRejectedValue(
      new ApiError("inference 'ghost' not found", 404, "not_found"),
    );
    renderWithProviders(<InferenceDetailView inferenceId="ghost" />);
    expect(await screen.findByText("Inference not found")).toBeInTheDocument();
  });
});
