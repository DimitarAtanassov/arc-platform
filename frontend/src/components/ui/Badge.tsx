import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * A compact status pill. Tone maps to the semantic palette so model and
 * inference states read consistently everywhere. Always pair color with a text
 * label (or an icon) so it never relies on color alone.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium leading-none",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-raised text-text-muted",
        accent: "border-[var(--accent-border)] bg-accent-muted text-accent",
        success: "border-[var(--success-border)] bg-success-soft text-success",
        warning: "border-[var(--warning-border)] bg-warning-soft text-warning",
        danger: "border-[var(--danger-border)] bg-danger-soft text-danger",
        info: "border-[var(--info-border)] bg-info-soft text-info",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  /** Show a leading status dot in the tone color. */
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, dot = false, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ tone }), className)}
      {...props}
    >
      {dot ? (
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-current opacity-80"
        />
      ) : null}
      {children}
    </span>
  ),
);
Badge.displayName = "Badge";

export { badgeVariants };
