"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { useUIPreferences } from "@/lib/preferences";
import { cn } from "@/lib/utils";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/**
 * The application chrome: a sticky sidebar column and a top bar wrapping the
 * routed content. Owns the responsive concerns — the desktop grid tracks the
 * collapse preference, and the mobile drawer open/close state (with Escape and
 * scroll-lock) lives here rather than in the sidebar.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { sidebarCollapsed, toggleSidebar } = useUIPreferences();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div
      className={cn(
        "grid min-h-screen grid-cols-1",
        "lg:transition-[grid-template-columns] lg:duration-[var(--t-med)] lg:ease-[var(--ease)]",
        sidebarCollapsed
          ? "lg:grid-cols-[var(--sidebar-w-collapsed)_1fr]"
          : "lg:grid-cols-[var(--sidebar-w)_1fr]",
      )}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onDismiss={closeMobile}
      />
      <div className="flex min-w-0 flex-col">
        <Topbar
          onOpenMobile={openMobile}
          onToggleCollapse={toggleSidebar}
          collapsed={sidebarCollapsed}
        />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
