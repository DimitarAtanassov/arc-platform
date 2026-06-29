/*
 * Client-side preferences: theme (dark default / light), data density, the
 * active tenant, and sidebar collapse. Persisted to localStorage and applied to
 * <html data-theme data-density> so CSS tokens switch. A matching inline script
 * in _document.tsx applies these before first paint to avoid a flash.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light";
export type Density = "comfortable" | "compact";

export interface Tenant {
  id: string;
  name: string;
  label: string;
  sigil: string;
}

// Multi-tenant is a first-class concept in the shell. Until a tenant directory
// backend exists, the switcher is seeded with these and the choice is local.
export const TENANTS: Tenant[] = [
  { id: "arc-research", name: "ARC Research", label: "Primary workspace", sigil: "Ar" },
  { id: "platform-eng", name: "Platform Engineering", label: "Infra & pipelines", sigil: "Pe" },
  { id: "safety-lab", name: "Safety Lab", label: "Red-team & guardrails", sigil: "Sl" },
];

interface PrefsValue {
  theme: Theme;
  density: Density;
  tenant: Tenant;
  sidebarCollapsed: boolean;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setDensity: (d: Density) => void;
  setTenant: (id: string) => void;
  toggleSidebar: () => void;
}

const KEYS = {
  theme: "arc.theme",
  density: "arc.density",
  tenant: "arc.tenant",
  sidebar: "arc.sidebar",
} as const;

const PrefsContext = createContext<PrefsValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [density, setDensityState] = useState<Density>("comfortable");
  const [tenantId, setTenantId] = useState<string>(TENANTS[0].id);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Hydrate from localStorage on mount (SSR-safe).
  useEffect(() => {
    const t = localStorage.getItem(KEYS.theme) as Theme | null;
    const d = localStorage.getItem(KEYS.density) as Density | null;
    const tn = localStorage.getItem(KEYS.tenant);
    const sb = localStorage.getItem(KEYS.sidebar);
    if (t === "dark" || t === "light") setThemeState(t);
    if (d === "comfortable" || d === "compact") setDensityState(d);
    if (tn && TENANTS.some((x) => x.id === tn)) setTenantId(tn);
    if (sb === "1") setSidebarCollapsed(true);
  }, []);

  // Reflect to the document + persist.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(KEYS.theme, theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
    localStorage.setItem(KEYS.density, density);
  }, [density]);
  useEffect(() => {
    localStorage.setItem(KEYS.tenant, tenantId);
  }, [tenantId]);
  useEffect(() => {
    localStorage.setItem(KEYS.sidebar, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    [],
  );
  const setDensity = useCallback((d: Density) => setDensityState(d), []);
  const setTenant = useCallback((id: string) => setTenantId(id), []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((s) => !s), []);

  const tenant = useMemo(
    () => TENANTS.find((t) => t.id === tenantId) ?? TENANTS[0],
    [tenantId],
  );

  const value = useMemo<PrefsValue>(
    () => ({
      theme,
      density,
      tenant,
      sidebarCollapsed,
      setTheme,
      toggleTheme,
      setDensity,
      setTenant,
      toggleSidebar,
    }),
    [theme, density, tenant, sidebarCollapsed, setTheme, toggleTheme, setDensity, setTenant, toggleSidebar],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used within PrefsProvider");
  return ctx;
}
