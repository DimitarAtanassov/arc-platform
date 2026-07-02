import { cn } from "@/lib/utils";

interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
  /** Purely visual separators should stay decorative (default). */
  decorative?: boolean;
}

/** A hairline divider. Defaults to decorative so it is ignored by assistive tech. */
export function Separator({
  orientation = "horizontal",
  className,
  decorative = true,
}: SeparatorProps) {
  return (
    <div
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
    />
  );
}
