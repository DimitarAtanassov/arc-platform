"use client";

/**
 * Client-side preferences for the console shell.
 *
 * Theme (system default, resolving to dark or light from the OS) is delegated to
 * next-themes, which owns the `data-theme` attribute and its own pre-paint
 * script. Density and sidebar collapse are UI-only preferences kept here:
 * persisted to localStorage and, for density, reflected onto `<html
 * data-density>` so the CSS tokens rescale. A matching pre-paint script
 * (DENSITY_SCRIPT) applies density before hydration to avoid a layout flash.
 */

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Density = "comfortable" | "compact";

const DENSITY_KEY = "arc.density";
const SIDEBAR_KEY = "arc.sidebar";

interface UIPreferences {
  density: Density;
  setDensity: (density: Density) => void;
  toggleDensity: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

const UIPreferencesContext = createContext<UIPreferences | null>(null);

function UIPreferencesProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<Density>("comfortable");
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);

  // Hydrate from localStorage after mount (SSR renders the defaults).
  useEffect(() => {
    try {
      const storedDensity = window.localStorage.getItem(DENSITY_KEY);
      const storedSidebar = window.localStorage.getItem(SIDEBAR_KEY);
      if (storedDensity === "compact" || storedDensity === "comfortable") {
        setDensityState(storedDensity);
      }
      if (storedSidebar === "1") {
        setSidebarCollapsedState(true);
      }
    } catch {
      // localStorage can be unavailable (private mode); defaults are fine.
    }
  }, []);

  // Reflect density onto the document and persist it.
  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
    try {
      window.localStorage.setItem(DENSITY_KEY, density);
    } catch {
      // Ignore persistence failures.
    }
  }, [density]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? "1" : "0");
    } catch {
      // Ignore persistence failures.
    }
  }, [sidebarCollapsed]);

  const setDensity = useCallback((next: Density) => setDensityState(next), []);
  const toggleDensity = useCallback(
    () =>
      setDensityState((current) =>
        current === "comfortable" ? "compact" : "comfortable",
      ),
    [],
  );
  const setSidebarCollapsed = useCallback(
    (collapsed: boolean) => setSidebarCollapsedState(collapsed),
    [],
  );
  const toggleSidebar = useCallback(
    () => setSidebarCollapsedState((current) => !current),
    [],
  );

  const value = useMemo<UIPreferences>(
    () => ({
      density,
      setDensity,
      toggleDensity,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,
    }),
    [
      density,
      setDensity,
      toggleDensity,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,
    ],
  );

  return (
    <UIPreferencesContext.Provider value={value}>
      {children}
    </UIPreferencesContext.Provider>
  );
}

/**
 * Root preferences provider: next-themes for theme, plus the UI preferences
 * (density, sidebar). Mount once, high in the tree, inside the shell.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      themes={["dark", "light"]}
    >
      <UIPreferencesProvider>{children}</UIPreferencesProvider>
    </NextThemesProvider>
  );
}

/** Access density and sidebar preferences. Must be used within the provider. */
export function useUIPreferences(): UIPreferences {
  const context = useContext(UIPreferencesContext);
  if (context === null) {
    throw new Error(
      "useUIPreferences must be used within a PreferencesProvider",
    );
  }
  return context;
}

// Re-exported so consumers get theme and UI preferences from one module.
export { useTheme };

/**
 * Pre-paint script that applies the persisted density before hydration. Injected
 * in the document head; theme is handled separately by next-themes' own script.
 */
export const DENSITY_SCRIPT = `(function(){try{var d=localStorage.getItem("${DENSITY_KEY}");document.documentElement.setAttribute("data-density",d==="compact"?"compact":"comfortable");}catch(e){document.documentElement.setAttribute("data-density","comfortable");}})();`;
