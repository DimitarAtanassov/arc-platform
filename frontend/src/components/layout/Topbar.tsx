"use client";

import {
  Menu,
  Monitor,
  Moon,
  PanelLeft,
  Rows2,
  Rows3,
  Sun,
  type LucideIcon,
} from "lucide-react";
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

const THEME_ORDER = ["system", "light", "dark"] as const;
type ThemeChoice = (typeof THEME_ORDER)[number];

const THEME_ICON: Record<ThemeChoice, LucideIcon> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const THEME_LABEL: Record<ThemeChoice, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

function isThemeChoice(value: string | undefined): value is ThemeChoice {
  return value === "system" || value === "light" || value === "dark";
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

  // next-themes resolves the setting only on the client; gate the control on
  // mount so SSR and first paint agree (system is the default).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const choice: ThemeChoice =
    mounted && isThemeChoice(theme) ? theme : "system";
  const nextChoice: ThemeChoice =
    THEME_ORDER[(THEME_ORDER.indexOf(choice) + 1) % THEME_ORDER.length] ??
    "system";
  const ThemeIcon = THEME_ICON[choice];

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
          content={`Theme: ${THEME_LABEL[choice]} · switch to ${THEME_LABEL[nextChoice]}`}
          side="bottom"
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Theme: ${THEME_LABEL[choice]}. Switch to ${THEME_LABEL[nextChoice]}.`}
            onClick={() => setTheme(nextChoice)}
          >
            <ThemeIcon />
          </Button>
        </Tooltip>
      </div>
    </header>
  );
}
