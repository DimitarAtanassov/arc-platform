"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button, Drawer } from "@/components/ui";

import { QuickEvalForm } from "./QuickEvalForm";

/**
 * The "New evaluation" entry point on the Evaluations surface: a primary action
 * that opens the quick-eval form in a right-side drawer. The drawer unmounts its
 * contents on close, so every open starts from a clean form.
 */
export function QuickEvalLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        New evaluation
      </Button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="New evaluation"
        description="Score an input and output against selected metrics."
      >
        <QuickEvalForm />
      </Drawer>
    </>
  );
}
