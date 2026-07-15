/**
 * Navigation information architecture.
 *
 * Two tiers, drawn straight from the product boundary. The console group is the
 * set of capabilities the BFF actually backs today: models and playground over
 * arc-model-lab, evaluations and experiments over arc-eval-service, and the
 * inference history. The roadmap group is a set of honest placeholders for
 * surfaces we know are coming but have no backend capability yet; those items
 * are intentionally not links, so the UI never implies a capability that does
 * not exist.
 */
import {
  Beaker,
  Boxes,
  ClipboardCheck,
  Database,
  FlaskConical,
  History,
  LayoutDashboard,
  ShieldCheck,
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
      description: "Console overview and service status",
    },
    {
      href: "/models",
      label: "Models",
      icon: Boxes,
      description: "Browse the open-source model catalog",
    },
    {
      href: "/lab",
      label: "Playground",
      icon: FlaskConical,
      description: "Run a model and score the result in place",
    },
    {
      href: "/evaluations",
      label: "Evaluations",
      icon: ClipboardCheck,
      description: "Scorers, judges, and evaluation records",
    },
    {
      href: "/experiments",
      label: "Experiments",
      icon: Beaker,
      description: "Create, run, and compare experiments",
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
 * Roadmap surfaces with no backend capability yet. Rendered disabled with a
 * "Soon" marker — honest placeholders for work we know is coming, never fake
 * pages that imply a capability the platform does not have.
 */
export const FUTURE_NAV: { label: string; items: FutureNavItem[] } = {
  label: "Roadmap",
  items: [
    {
      label: "Datasets",
      icon: Database,
      note: "Curated evaluation sets. Not built yet.",
    },
    {
      label: "Guardrails",
      icon: ShieldCheck,
      note: "Safety and policy checks. Not built yet.",
    },
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
