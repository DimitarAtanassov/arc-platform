import { screen } from "@testing-library/react";
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
    runInference: vi.fn(),
  };
});

import { ApiError, getModels, runInference } from "@/lib/api/client";
import type { InferenceDetail, ModelSummary } from "@/lib/api/schemas";
import { renderWithProviders } from "@/test/render";

import { InferenceLab } from "./InferenceLab";

const MODELS: ModelSummary[] = [
  {
    modelId: "gpt-4o",
    displayName: "GPT-4o",
    provider: "openai",
    status: "available",
    modalities: ["text"],
  },
  {
    modelId: "claude-sonnet-4",
    displayName: "Claude Sonnet 4",
    provider: "anthropic",
    status: "available",
    modalities: ["text"],
  },
];

const RESULT: InferenceDetail = {
  inferenceId: "inf-1",
  modelId: "gpt-4o",
  status: "succeeded",
  createdAt: "2026-07-01T12:00:00Z",
  latencyMs: 812.5,
  totalTokens: 30,
  promptPreview: "Say hello",
  prompt: "Say hello",
  systemPrompt: null,
  output: "Hello! How can I help?",
  finishReason: "stop",
  params: { temperature: null, maxTokens: null, topP: null },
  usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
  error: null,
};

async function selectModelAndPrompt(user: ReturnType<typeof userEvent.setup>) {
  // Wait for the catalog to load, then choose a model and enter a prompt.
  await screen.findByRole("option", { name: /GPT-4o/ });
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Model" }),
    "gpt-4o",
  );
  await user.type(screen.getByRole("textbox", { name: "Prompt" }), "Say hello");
}

beforeEach(() => {
  vi.mocked(getModels).mockReset();
  vi.mocked(runInference).mockReset();
  vi.mocked(getModels).mockResolvedValue(MODELS);
});

describe("InferenceLab", () => {
  it("loads models into the selector", async () => {
    renderWithProviders(<InferenceLab />);
    expect(
      await screen.findByRole("option", { name: /GPT-4o \(gpt-4o\)/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Claude Sonnet 4/ }),
    ).toBeInTheDocument();
  });

  it("disables Run until a model and prompt are provided", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InferenceLab />);
    await screen.findByRole("option", { name: /GPT-4o/ });

    const run = screen.getByRole("button", { name: "Run inference" });
    expect(run).toBeDisabled();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Model" }),
      "gpt-4o",
    );
    expect(run).toBeDisabled();

    await user.type(
      screen.getByRole("textbox", { name: "Prompt" }),
      "Say hello",
    );
    expect(run).toBeEnabled();
  });

  it("renders output and run metadata on success", async () => {
    const user = userEvent.setup();
    vi.mocked(runInference).mockResolvedValue(RESULT);
    renderWithProviders(<InferenceLab />);
    await selectModelAndPrompt(user);

    await user.click(screen.getByRole("button", { name: "Run inference" }));

    expect(
      await screen.findByText("Hello! How can I help?"),
    ).toBeInTheDocument();
    expect(screen.getByText("812.5 ms")).toBeInTheDocument();
    expect(screen.getByText("Prompt tokens")).toBeInTheDocument();
    expect(screen.getByText("Completion tokens")).toBeInTheDocument();
    expect(screen.getAllByText("inf-1").length).toBeGreaterThan(0);
    expect(runInference).toHaveBeenCalledWith({
      modelId: "gpt-4o",
      prompt: "Say hello",
    });
  });

  it("preserves input and shows a safe error on failure", async () => {
    const user = userEvent.setup();
    vi.mocked(runInference).mockRejectedValue(
      new ApiError("arc-model-lab returned an error", 502, "upstream_error"),
    );
    renderWithProviders(<InferenceLab />);
    await selectModelAndPrompt(user);

    await user.click(screen.getByRole("button", { name: "Run inference" }));

    expect(await screen.findByText("Inference failed")).toBeInTheDocument();
    expect(screen.getByText("upstream_error")).toBeInTheDocument();
    // Input survives the failure so the user can adjust and retry.
    expect(screen.getByRole("textbox", { name: "Prompt" })).toHaveValue(
      "Say hello",
    );
    expect(screen.getByRole("combobox", { name: "Model" })).toHaveValue(
      "gpt-4o",
    );
  });

  it("links the result to its inference detail", async () => {
    const user = userEvent.setup();
    vi.mocked(runInference).mockResolvedValue(RESULT);
    renderWithProviders(<InferenceLab />);
    await selectModelAndPrompt(user);

    await user.click(screen.getByRole("button", { name: "Run inference" }));
    await screen.findByText("Hello! How can I help?");

    expect(screen.getByRole("link", { name: /View detail/ })).toHaveAttribute(
      "href",
      "/inference/inf-1",
    );
  });
});
