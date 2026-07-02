import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** A multi-line text field. Used for the inference prompt. */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text transition-colors placeholder:text-text-faint hover:border-border-strong focus:border-[var(--accent-border)]",
      "min-h-32 resize-y leading-relaxed",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
