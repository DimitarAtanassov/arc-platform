// Navigation IA. Standard, industry-recognizable section names — the arcane
// character lives in iconography and palette, never in the labels.
import type { ComponentType, SVGProps } from "react";

import {
  Dashboard,
  Guardrails,
  Judges,
  Pipeline,
  Playground,
  Runs,
  Settings,
  Spans,
  Targets,
  Traces,
} from "@/components/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
  // Extra path prefixes that should mark this item active.
  match?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Observe",
    items: [
      { href: "/", label: "Dashboard", icon: Dashboard },
      { href: "/traces", label: "Traces", icon: Traces, match: ["/requests"] },
      { href: "/spans", label: "Spans", icon: Spans },
    ],
  },
  {
    label: "Evaluate",
    items: [
      { href: "/playground", label: "Playground", icon: Playground },
      { href: "/eval-targets", label: "Eval Targets", icon: Targets },
      { href: "/eval-runs", label: "Eval Runs", icon: Runs },
      { href: "/judges", label: "Judges", icon: Judges },
    ],
  },
  {
    label: "Operate",
    items: [
      { href: "/guardrails", label: "Guardrails", icon: Guardrails },
      { href: "/pipeline-health", label: "Pipeline Health", icon: Pipeline },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
};

export const ALL_NAV: NavItem[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  SETTINGS_ITEM,
];

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") {
    return pathname === "/";
  }
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  return (item.match ?? []).some(
    (m) => pathname === m || pathname.startsWith(`${m}/`),
  );
}
