"use client";

import type { ReactNode } from "react";

import { QueryProvider } from "@/components/query-provider";
import { TooltipProvider } from "@/components/ui";
import { PreferencesProvider } from "@/lib/preferences";

/**
 * Client providers mounted once at the root: preferences (theme, density,
 * sidebar), the TanStack Query client for server state, and the shared tooltip
 * timing controller. Kept separate from the server root layout so the layout
 * itself stays a server component.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <PreferencesProvider>
      <QueryProvider>
        <TooltipProvider delayDuration={200} skipDelayDuration={300}>
          {children}
        </TooltipProvider>
      </QueryProvider>
    </PreferencesProvider>
  );
}
