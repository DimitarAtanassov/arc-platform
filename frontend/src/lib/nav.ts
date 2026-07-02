/**
 * Navigation information architecture.
 *
 * Two tiers, drawn straight from the product boundary: the primary group is the
 * set of capabilities the BFF actually backs today (models and inference); the
 * planned group is a set of honest placeholders for surfaces that have no
 * backend capability yet. Planned items are intentionally not links — they never
 * route anywhere, so the UI cannot imply a capability that does not exist.
 */
import {
  Boxes,
  ClipboardCheck,
  Database,
  FlaskConical,
  History,
  LayoutDashboard,
  ShieldCheck,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Short description used for tooltips and aria labels. */
  description: string;
  /** Extra path prefixes that also mark this item active. */
  match?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Backend-backed capabilities. These are real, navigable routes. */
export const PRIMARY_NAV: NavGroup = {
  label: "Console",
  items: [
    {
      href: "/",
      label: "Overview",
      icon: LayoutDashboard,
      description: "Console overview and capabilities",
    },
    {
      href: "/models",
      label: "Models",
      icon: Boxes,
      description: "Browse the model catalog",
    },
    {
      href: "/lab",
      label: "Inference Lab",
      icon: FlaskConical,
      description: "Run a single inference",
    },
    {
      href: "/inference",
      label: "History",
      icon: History,
      description: "Inspect past inference runs",
    },
  ],
};

export interface FutureNavItem {
  label: string;
  icon: LucideIcon;
  /** Why the item is not active yet. Surfaced in a tooltip. */
  note: string;
}

/**
 * Planned surfaces with no backend capability yet. Rendered disabled with a
 * "Planned" marker — placeholders, never fake pages.
 */
export const FUTURE_NAV: { label: string; items: FutureNavItem[] } = {
  label: "Planned",
  items: [
    { label: "Datasets", icon: Database, note: "No backend capability yet" },
    {
      label: "Evaluations",
      icon: ClipboardCheck,
      note: "No backend capability yet",
    },
    {
      label: "Guardrails",
      icon: ShieldCheck,
      note: "No backend capability yet",
    },
    { label: "Tracing", icon: Waypoints, note: "No backend capability yet" },
  ],
};

/** Flat list of the real, navigable items (used by tests and command surfaces). */
export const NAV_ITEMS: NavItem[] = PRIMARY_NAV.items;

/** Whether a nav item should render active for the given pathname. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") {
    return pathname === "/";
  }
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
    return true;
  }
  return (item.match ?? []).some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
