"use client";

import { Play } from "lucide-react";
import { useId, useState } from "react";

import { Button, Panel, Spinner, Textarea } from "@/components/ui";
import { useRunInference } from "@/lib/api/queries";
import type { InferenceDetail } from "@/lib/api/schemas";

import { GenerationConfig } from "./GenerationConfig";
import { ModelSelect } from "./ModelSelect";
import { OutputPanel } from "./OutputPanel";
import { RecentRuns } from "./RecentRuns";

/**
 * The inference workbench: a split pane (model and prompt on the left, output on
 * the right) over a session run log. State is deliberately local and controlled,
 * so input survives a failed run. The run itself is a TanStack Query mutation;
 * the browser calls only the BFF.
 */
export function InferenceLab() {
  const modelFieldId = useId();
  const promptFieldId = useId();

  const [modelId, setModelId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [current, setCurrent] = useState<InferenceDetail | null>(null);
  const [runs, setRuns] = useState<InferenceDetail[]>([]);

  const mutation = useRunInference();
  const canRun = modelId !== "" && prompt.trim() !== "" && !mutation.isPending;

  const onRun = () => {
    if (!canRun) {
      return;
    }
    mutation.mutate(
      { modelId, prompt: prompt.trim() },
      {
        onSuccess: (detail) => {
          setCurrent(detail);
          setRuns((prev) =>
            [
              detail,
              ...prev.filter((run) => run.inferenceId !== detail.inferenceId),
            ].slice(0, 20),
          );
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-4">
          <Panel title="Model & prompt">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor={modelFieldId}
                  className="block text-[13px] font-medium text-text-muted"
                >
                  Model
                </label>
                <ModelSelect
                  id={modelFieldId}
                  value={modelId}
                  onChange={setModelId}
                  disabled={mutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={promptFieldId}
                  className="block text-[13px] font-medium text-text-muted"
                >
                  Prompt
                </label>
                <Textarea
                  id={promptFieldId}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Enter a prompt to send to the model..."
                  disabled={mutation.isPending}
                  rows={8}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] text-text-faint">
                  The browser calls only the BFF.
                </p>
                <Button
                  variant="primary"
                  onClick={onRun}
                  disabled={!canRun}
                  className="gap-2"
                >
                  {mutation.isPending ? (
                    <Spinner className="text-on-accent" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  {mutation.isPending ? "Running..." : "Run inference"}
                </Button>
              </div>
            </div>
          </Panel>

          <GenerationConfig />
        </div>

        <Panel
          title="Output"
          description="The model's response and run metadata."
        >
          <OutputPanel
            isPending={mutation.isPending}
            error={mutation.error}
            result={current}
          />
        </Panel>
      </div>

      <Panel title="Recent runs" description="Results from this session.">
        <RecentRuns
          runs={runs}
          onSelect={setCurrent}
          activeId={current?.inferenceId}
        />
      </Panel>
    </div>
  );
}
