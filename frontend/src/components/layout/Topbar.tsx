"use client";

import { Menu, Moon, PanelLeft, Rows2, Rows3, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button, Tooltip } from "@/components/ui";
import { useTheme, useUIPreferences } from "@/lib/preferences";
import { cn } from "@/lib/utils";

interface TopbarProps {
  /** Open the mobile navigation drawer. */
  onOpenMobile: () => void;
  /** Toggle the desktop sidebar between full and collapsed. */
  onToggleCollapse: () => void;
  collapsed: boolean;
}

/**
 * The application top bar: navigation controls on the left (mobile drawer opener,
 * desktop collapse), display preferences on the right (density, theme). It holds
 * only real, working controls — no command palette exists yet, so none is faked.
 */
export function Topbar({
  onOpenMobile,
  onToggleCollapse,
  collapsed,
}: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { density, toggleDensity } = useUIPreferences();

  // next-themes resolves the theme only on the client; gate theme-dependent UI
  // on mount so SSR and first paint agree (dark is the default).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? theme !== "light" : true;

  return (
    <header className="sticky top-0 z-30 flex h-[var(--topbar-h)] items-center justify-between gap-2 border-b border-border bg-surface px-3 lg:px-4">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation"
          onClick={onOpenMobile}
        >
          <Menu />
        </Button>
        <Tooltip
          content={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          side="bottom"
        >
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            aria-label="Toggle sidebar"
            aria-pressed={collapsed}
            onClick={onToggleCollapse}
          >
            <PanelLeft className={cn(collapsed && "rotate-180")} />
          </Button>
        </Tooltip>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip
          content={
            density === "compact" ? "Compact density" : "Comfortable density"
          }
          side="bottom"
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle density"
            onClick={toggleDensity}
          >
            {density === "compact" ? <Rows2 /> : <Rows3 />}
          </Button>
        </Tooltip>
        <Tooltip
          content={isDark ? "Switch to light" : "Switch to dark"}
          side="bottom"
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? <Moon /> : <Sun />}
          </Button>
        </Tooltip>
      </div>
    </header>
  );
}
