"use client";

import { cn } from "@/lib/utils";

import { CopyButton } from "./CopyButton";

interface CodeBlockProps {
  code: string;
  className?: string;
  /** Accessible label for the code region. */
  label?: string;
}

/** A monospace, scrollable code region with a copy control. Read-only. */
export function CodeBlock({ code, className, label = "Code" }: CodeBlockProps) {
  return (
    <div className={cn("relative", className)}>
      <CopyButton
        value={code}
        className="absolute right-2 top-2 h-7 gap-1.5 px-2"
      />
      <pre
        aria-label={label}
        className="max-h-[60vh] overflow-auto rounded-md border border-border bg-surface-subtle p-4 font-mono text-xs leading-relaxed text-code"
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
