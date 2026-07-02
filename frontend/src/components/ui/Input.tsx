import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const inputBase =
  "h-[var(--control-h)] w-full rounded-md border border-border bg-surface px-3 text-sm text-text transition-colors placeholder:text-text-faint hover:border-border-strong focus:border-[var(--accent-border)]";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Optional leading icon (rendered inside the field). */
  icon?: ReactNode;
}

/** A single-line text field. Used for the catalog search and lab prompts. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, ...props }, ref) => {
    if (!icon) {
      return (
        <input ref={ref} className={cn(inputBase, className)} {...props} />
      );
    }
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint [&_svg]:size-4">
          {icon}
        </span>
        <input
          ref={ref}
          className={cn(inputBase, "pl-8", className)}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = "Input";
