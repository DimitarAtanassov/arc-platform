import { ChevronDown } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * A styled native select. Native is deliberate: it is fully keyboard and screen
 * reader accessible with no extra JavaScript, which suits a filter control.
 */
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "h-[var(--control-h)] w-full appearance-none rounded-md border border-border bg-surface pl-3 pr-8 text-sm text-text transition-colors hover:border-border-strong focus:border-[var(--accent-border)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden
      className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-text-faint"
    />
  </div>
));
Select.displayName = "Select";
