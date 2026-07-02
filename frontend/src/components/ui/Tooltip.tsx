"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Mount once near the app root so tooltips share one timing controller. */
export const TooltipProvider = TooltipPrimitive.Provider;

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: TooltipPrimitive.TooltipContentProps["side"];
  align?: TooltipPrimitive.TooltipContentProps["align"];
  sideOffset?: number;
  /** Force-open, used mainly in tests and demos. */
  open?: boolean;
  delayDuration?: number;
}

/**
 * A thin, calm tooltip over Radix. Kept text-only and short — it is a label
 * affordance (e.g. a collapsed sidebar item), not a content surface.
 */
export function Tooltip({
  content,
  children,
  side = "right",
  align = "center",
  sideOffset = 6,
  open,
  delayDuration = 200,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root open={open} delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={cn(
            "z-50 max-w-xs rounded-md border border-border bg-surface-raised px-2 py-1",
            "text-xs text-text shadow-[var(--shadow-2)]",
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-[var(--surface-raised)]" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export type TooltipRootProps = ComponentPropsWithoutRef<
  typeof TooltipPrimitive.Root
>;
