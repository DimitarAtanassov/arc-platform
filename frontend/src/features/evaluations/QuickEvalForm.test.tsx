import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formatScore } from "@/lib/format";
import type { EvaluationEnvelope } from "@/lib/api/schemas";
import { renderWithProviders } from "@/test/render";

import { QuickEvalForm } from "./QuickEvalForm";

// The query layer is the network seam; mock it so the form's behavior is tested
// without a live backend (the real MetricPicker still renders from useMetrics).
const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("@/lib/api/queries", () => ({
  useMetrics: () => ({
    data: [
      { name: "faithfulness", rubric: "Grounded in the source" },
      { name: "answer_relevance", rubric: "Answers the question" },
    ],
    isLoading: false,
  }),
  useEvaluateInteraction: () => ({ mutate, isPending: false, isError: false }),
}));

afterEach(() => {
  mutate.mockReset();
});

describe("QuickEvalForm", () => {
  it("keeps Evaluate disabled until an input, an output, and a metric are set", async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickEvalForm />);

    const evaluate = screen.getByRole("button", { name: "Evaluate" });
    expect(evaluate).toBeDisabled();

    await user.type(screen.getByLabelText("Input"), "the sky is blue");
    await user.type(screen.getByLabelText("Output"), "the sky is blue");
    expect(evaluate).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "faithfulness" }));
    expect(evaluate).toBeEnabled();
  });

  it("submits the trimmed interaction and the chosen metrics", async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickEvalForm />);

    await user.type(screen.getByLabelText("Input"), "  question  ");
    await user.type(screen.getByLabelText("Output"), "  answer  ");
    await user.click(screen.getByRole("button", { name: "faithfulness" }));
    await user.click(screen.getByRole("button", { name: "Evaluate" }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]?.[0]).toEqual({
      inputText: "question",
      outputText: "answer",
      metrics: ["faithfulness"],
    });
  });

  it("renders the returned status and scores on success", async () => {
    const envelope: EvaluationEnvelope = {
      status: "completed",
      results: [
        {
          metricName: "faithfulness",
          score: 0.9,
          evaluatorName: "faithfulness-judge",
          evaluatorVersion: null,
        },
      ],
    };
    mutate.mockImplementation(
      (
        _payload: unknown,
        options?: { onSuccess?: (value: EvaluationEnvelope) => void },
      ) => options?.onSuccess?.(envelope),
    );

    const user = userEvent.setup();
    renderWithProviders(<QuickEvalForm />);

    await user.type(screen.getByLabelText("Input"), "q");
    await user.type(screen.getByLabelText("Output"), "a");
    await user.click(screen.getByRole("button", { name: "faithfulness" }));
    await user.click(screen.getByRole("button", { name: "Evaluate" }));

    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("faithfulness-judge")).toBeInTheDocument();
    expect(screen.getByText(formatScore(0.9))).toBeInTheDocument();
  });
});
