import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * The console's one button. Variants are intent-based, not decorative: `primary`
 * carries the single amber accent and is used sparingly (one per view); the rest
 * are quiet. Icon sizing and disabled behavior are baked in.
 */
const buttonVariants = cva(
  [
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md border text-sm font-medium transition-colors duration-[var(--t-fast)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-accent text-on-accent hover:bg-accent-hover",
        outline:
          "border-border bg-transparent text-text hover:border-border-strong hover:bg-surface-raised",
        subtle:
          "border-transparent bg-surface-raised text-text hover:bg-surface-subtle",
        ghost:
          "border-transparent bg-transparent text-text-muted hover:bg-surface-raised hover:text-text",
        danger: "border-transparent bg-danger text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-[var(--control-h)] px-4",
        icon: "size-[var(--control-h)] px-0",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render the child as the button (Radix Slot), inheriting styles. */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        type={asChild ? type : (type ?? "button")}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
